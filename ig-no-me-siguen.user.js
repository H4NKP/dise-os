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
  const DELAY_MS = 1500;                      // pausa entre páginas para no saturar
  const LONG_PAUSE_EVERY = 10;                // cada 10 páginas…
  const LONG_PAUSE_MS = 8000;                 // …una pausa más larga
  const RETRY_WAITS_S = [30, 60, 120, 240];   // esperas si Instagram limita (429) o falla la red
  const CACHE_KEY = 'igNoMeSiguen.cache';
  const PROGRESS_KEY = 'igNoMeSiguen.progress';
  const PROGRESS_TTL_MS = 24 * 60 * 60 * 1000; // un análisis a medias se puede continuar durante 24 h
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;    // reutiliza el resultado durante 6 h
  const PANEL_ID = 'ig-no-me-siguen-panel';

  let running = false;
  let lastPath = '';
  let totals = {};                            // { following, followers } según el perfil

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  class RateLimited extends Error {}

  async function fetchPage(userId, kind, maxId, onWait) {
    const url = new URL(`/api/v1/friendships/${userId}/${kind}/`, location.origin);
    url.searchParams.set('count', PAGE_SIZE);
    if (maxId) url.searchParams.set('max_id', maxId);
    for (let attempt = 0; ; attempt++) {
      let res = null;
      try {
        res = await fetch(url, {
          credentials: 'include',
          headers: { 'X-IG-App-ID': APP_ID, 'X-Requested-With': 'XMLHttpRequest' },
        });
      } catch (_) { /* red caída o Safari suspendió la pestaña: reintentamos */ }
      if (res && res.ok) return res.json();
      if (res && res.status !== 429 && res.status < 500) {
        throw new Error(`Instagram respondió ${res.status} al leer ${kind}`);
      }
      if (attempt >= RETRY_WAITS_S.length) throw new RateLimited();
      for (let s = RETRY_WAITS_S[attempt]; s > 0; s--) {
        onWait(s);
        await sleep(1000);
      }
    }
  }

  // Descarga una lista guardando el progreso tras cada página, para poder continuar
  // si se cierra la pestaña, se bloquea el iPhone o Instagram nos limita.
  async function fetchList(state, kind, onProgress, onWait) {
    const part = state[kind];
    let pages = 0;
    while (!part.done) {
      const data = await fetchPage(state.userId, kind, part.maxId, onWait);
      for (const u of data.users || []) {
        const id = String(u.pk ?? u.id);
        part.items.push(kind === 'followers'
          ? id
          : { id, username: u.username, name: u.full_name, pic: u.profile_pic_url, verified: u.is_verified });
      }
      part.maxId = data.next_max_id || null;
      part.done = !part.maxId;
      saveProgress(state);
      onProgress();
      pages++;
      if (!part.done) await sleep(pages % LONG_PAUSE_EVERY ? DELAY_MS + Math.random() * 700 : LONG_PAUSE_MS);
    }
    return part.items;
  }

  function loadProgress(userId) {
    try {
      const p = JSON.parse(localStorage.getItem(PROGRESS_KEY));
      if (p && p.userId === userId && Date.now() - p.startedAt < PROGRESS_TTL_MS) return p;
    } catch (_) {}
    return {
      userId, startedAt: Date.now(),
      following: { items: [], maxId: null, done: false },
      followers: { items: [], maxId: null, done: false },
    };
  }

  function saveProgress(state) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function clearProgress() {
    try { localStorage.removeItem(PROGRESS_KEY); } catch (_) {}
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
        position: 'fixed', zIndex: 2147483647, display: 'flex', flexDirection: 'column',
        ...(window.innerWidth < 600
          ? { left: '8px', right: '8px', bottom: 'calc(8px + env(safe-area-inset-bottom))', maxHeight: '70vh' }
          : { top: '16px', right: '16px', width: '360px', maxHeight: '75vh' }),
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

  function showStatus(text, extra = []) {
    const p = panel();
    p.replaceChildren(header('¿Quién no me sigue?'),
      el('div', { style: { padding: '14px', lineHeight: '1.4' } }, text, ...extra));
  }

  function progressBar(done, total) {
    const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    return el('div', { style: { marginTop: '10px', height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' } },
      el('div', { style: { width: pct + '%', height: '100%', background: '#0095f6', transition: 'width .3s' } }));
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
    const state = loadProgress(userId);
    const fmt = (n) => n.toLocaleString('es');
    const render = (waitS) => {
      const nf = state.following.items.length, nr = state.followers.items.length;
      const tf = totals.following || 0, tr = totals.followers || 0;
      const of = (n, t) => (t ? `${fmt(n)} / ${fmt(t)}` : fmt(n));
      const remainingPages = Math.max(0, Math.ceil((tf - nf) / PAGE_SIZE)) + Math.max(0, Math.ceil((tr - nr) / PAGE_SIZE));
      const etaMin = Math.ceil((remainingPages * (DELAY_MS + 700)) / 60000);
      showStatus(
        waitS
          ? `Instagram pidió ir más despacio. Reintentando en ${waitS} s…`
          : `Analizando… seguidos ${of(nf, tf)} · seguidores ${of(nr, tr)}`,
        [
          progressBar(nf + nr, tf + tr),
          el('div', { style: { marginTop: '8px', color: '#666', fontSize: '12px' } },
            (tf + tr ? `Quedan ~${etaMin} min. ` : '') +
            'Puedes salir y volver a Seguidos: continuará donde lo dejó.'),
        ]);
    };
    try {
      render();
      const following = await fetchList(state, 'following', () => render(), render);
      const followers = await fetchList(state, 'followers', () => render(), render);
      const followerIds = new Set(followers);
      const list = following.filter((u) => !followerIds.has(u.id));
      const entry = { userId, at: Date.now(), list };
      writeCache(entry);
      clearProgress();
      showResult(entry);
    } catch (err) {
      const resume = el('button', { onclick: () => run(true), style: { ...btnStyle(), display: 'block', marginTop: '10px' } }, 'Continuar ahora');
      const done = state.following.items.length + state.followers.items.length;
      showStatus(err instanceof RateLimited
        ? `Instagram está limitando las consultas. Ya van ${fmt(done)} cuentas guardadas; espera unos 15–30 min y vuelve a abrir Seguidos para continuar.`
        : `No se pudo completar: ${err.message}. El progreso está guardado; inténtalo más tarde.`, [resume]);
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
      const user = data?.data?.user;
      idByUsername[username] = String(user?.id ?? '');
      if (idByUsername[username] === myId) {
        totals = { following: user?.edge_follow?.count, followers: user?.edge_followed_by?.count };
      }
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
