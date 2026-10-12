// ==UserScript==
// @name         IG – ¿Quién no me sigue de vuelta?
// @namespace    https://github.com/h4nkp/dise-os
// @version      1.0.0
// @description  Al abrir tu lista de "Seguidos" en instagram.com muestra una alerta con las cuentas que no te siguen de vuelta.
// @match        https://www.instagram.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const APP_ID = '936619743392459';           // App ID público de la web de Instagram
  const PAGE_SIZE = 100;
  const DELAY_MS = 1200;                      // pausa entre páginas para no saturar
  const CACHE_KEY = 'igNoMeSiguen.cache';
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;    // reutiliza el resultado durante 6 h
  const PANEL_ID = 'ig-no-me-siguen-panel';

  let running = false;
  let lastPath = '';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function fetchList(userId, kind, onProgress) {
    const users = [];
    let maxId = null;
    do {
      const url = new URL(`/api/v1/friendships/${userId}/${kind}/`, location.origin);
      url.searchParams.set('count', PAGE_SIZE);
      if (maxId) url.searchParams.set('max_id', maxId);
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'X-IG-App-ID': APP_ID, 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) throw new Error(`Instagram respondió ${res.status} al leer ${kind}`);
      const data = await res.json();
      for (const u of data.users || []) {
        users.push({ id: String(u.pk ?? u.id), username: u.username, name: u.full_name, pic: u.profile_pic_url, verified: u.is_verified });
      }
      onProgress(kind, users.length);
      maxId = data.next_max_id || null;
      if (maxId) await sleep(DELAY_MS);
    } while (maxId);
    return users;
  }

  function readCache(userId) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (c && c.userId === userId && Date.now() - c.at < CACHE_TTL_MS) return c;
    } catch (_) {}
    return null;
  }

  function writeCache(entry) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(entry)); } catch (_) {}
  }

  // ---------- UI ----------
  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style') Object.assign(n.style, v);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of children) n.append(c);
    return n;
  }

  function panel() {
    let p = document.getElementById(PANEL_ID);
    if (p) return p;
    p = el('div', {
      id: PANEL_ID,
      style: {
        position: 'fixed', top: '16px', right: '16px', zIndex: 2147483647,
        width: 'min(360px, calc(100vw - 32px))', maxHeight: '75vh', display: 'flex', flexDirection: 'column',
        background: '#fff', color: '#111', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,.25)',
        font: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', overflow: 'hidden',
      },
    });
    document.body.append(p);
    return p;
  }

  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function header(title, actions = []) {
    return el('div', {
      style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderBottom: '1px solid #eee', fontWeight: '600' },
    }, el('span', { style: { flex: '1' } }, title), ...actions,
      el('button', { title: 'Cerrar', onclick: closePanel, style: btnStyle() }, '✕'));
  }

  function btnStyle() {
    return { border: 'none', background: '#efefef', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', font: 'inherit' };
  }

  function showStatus(text) {
    const p = panel();
    p.replaceChildren(header('¿Quién no me sigue?'), el('div', { style: { padding: '14px' } }, text));
  }

  function showResult(entry) {
    const { list, at } = entry;
    const p = panel();
    const refresh = el('button', { title: 'Volver a calcular', onclick: () => run(true), style: btnStyle() }, '↻');
    const mins = Math.round((Date.now() - at) / 60000);
    const sub = el('div', { style: { padding: '8px 14px', color: '#666', fontSize: '12px' } },
      `${list.length} cuenta(s) no te siguen de vuelta · calculado hace ${mins} min`);

    const ul = el('div', { style: { overflowY: 'auto', padding: '4px 0' } });
    if (!list.length) ul.append(el('div', { style: { padding: '14px' } }, '🎉 Todos te siguen de vuelta.'));
    for (const u of list) {
      ul.append(el('a', {
        href: `/${u.username}/`, target: '_blank', rel: 'noopener',
        style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 14px', color: 'inherit', textDecoration: 'none' },
      },
        el('img', { src: u.pic, referrerpolicy: 'no-referrer', style: { width: '32px', height: '32px', borderRadius: '50%', background: '#ddd' } }),
        el('div', { style: { minWidth: '0' } },
          el('div', { style: { fontWeight: '600' } }, u.username + (u.verified ? ' ✔︎' : '')),
          el('div', { style: { color: '#666', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, u.name || ''))));
    }
    p.replaceChildren(header(`⚠️ ${list.length} no te siguen`, [refresh]), sub, ul);
  }

  // ---------- lógica principal ----------
  async function run(force = false) {
    if (running) return;
    const userId = getCookie('ds_user_id');
    if (!userId) return showStatus('Inicia sesión en Instagram para usar esta función.');

    if (!force) {
      const cached = readCache(userId);
      if (cached) return showResult(cached);
    }

    running = true;
    try {
      const progress = { followers: 0, following: 0 };
      const onProgress = (kind, n) => {
        progress[kind] = n;
        showStatus(`Analizando… seguidos: ${progress.following} · seguidores: ${progress.followers}`);
      };
      onProgress('following', 0);
      const following = await fetchList(userId, 'following', onProgress);
      const followers = await fetchList(userId, 'followers', onProgress);
      const followerIds = new Set(followers.map((u) => u.id));
      const list = following.filter((u) => !followerIds.has(u.id));
      const entry = { userId, at: Date.now(), list };
      writeCache(entry);
      showResult(entry);
    } catch (err) {
      showStatus(`No se pudo completar: ${err.message}. Inténtalo más tarde.`);
    } finally {
      running = false;
    }
  }

  // Averigua si /<username>/following/ es tu propio perfil comparando su id con ds_user_id.
  const idByUsername = {};
  async function isOwnProfile(username, myId) {
    if (!(username in idByUsername)) {
      const url = new URL('/api/v1/users/web_profile_info/', location.origin);
      url.searchParams.set('username', username);
      const res = await fetch(url, { credentials: 'include', headers: { 'X-IG-App-ID': APP_ID } });
      if (!res.ok) return false;
      const data = await res.json();
      idByUsername[username] = String(data?.data?.user?.id ?? '');
    }
    return idByUsername[username] === myId;
  }

  // Instagram es una SPA: vigilamos los cambios de URL.
  async function onRoute() {
    const path = location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    const m = path.match(/^\/([^/]+)\/following\/?$/);
    const myId = getCookie('ds_user_id');
    if (!m || !myId) return;
    try {
      if (await isOwnProfile(m[1], myId)) run();
    } catch (_) {}
  }

  setInterval(onRoute, 700);
  onRoute();
})();
