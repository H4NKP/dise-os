# IG – ¿Quién no me sigue de vuelta?

Un *userscript* que, cuando abres **tu lista de "Seguidos"** en instagram.com
(`instagram.com/<tu_usuario>/following/`), muestra automáticamente una alerta
con las cuentas que **no te siguen de vuelta**.

![flujo](https://img.shields.io/badge/Instagram-web-E4405F)

## Cómo funciona

1. Detecta que entraste a `/<tu_usuario>/following/` (solo en tu propio perfil).
2. Usa tu sesión ya iniciada para leer tus *seguidos* y tus *seguidores*
   (con una pausa entre páginas para no saturar a Instagram).
3. Calcula `seguidos − seguidores` y lo muestra en un panel flotante,
   con foto, usuario y enlace a cada perfil.
4. Guarda el resultado 6 horas en tu navegador; pulsa **↻** para recalcular.

Nada sale de tu navegador: no hay servidor, ni contraseñas, ni terceros.

## Instalación

> ⚠️ La **app nativa** de Instagram (iPhone/Android) no se puede modificar.
> Esto funciona en **instagram.com desde el navegador**, en el ordenador o en el móvil.

### 🍎 macOS

Elige **una** de estas opciones:

**A) Safari como app nativa de macOS** (requiere Xcode, gratis en el App Store)
```bash
git clone -b claude/festive-archimedes-o5hj6c https://github.com/H4NKP/dise-os.git
cd dise-os
./macos/build-safari.sh
```
El script crea la app **"IG No Me Siguen"**, la copia a `/Applications` y te indica
cómo activarla en *Safari → Ajustes → Extensiones*. Como no está firmada con una
cuenta de Apple Developer, hay que activar *Desarrollo → Permitir extensiones sin
firmar* (Safari lo vuelve a pedir cada vez que se reinicia).

**B) Chrome, Brave, Edge o Arc en Mac** (sin instalar nada más)
1. Descarga el repositorio (botón *Code → Download ZIP*) y descomprímelo.
2. Abre `chrome://extensions` y activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y elige la carpeta [`extension/`](./extension).

**C) Safari sin Xcode**
Instala la app gratuita **Userscripts** del Mac App Store, actívala en
*Safari → Ajustes → Extensiones*, y copia `ig-no-me-siguen.user.js` en su carpeta.

Con cualquiera de ellas: abre instagram.com → tu perfil → **Seguidos**.

### Windows / Linux (Chrome, Edge, Firefox)
1. Instala la extensión **[Tampermonkey](https://www.tampermonkey.net/)**.
2. Abre el archivo [`ig-no-me-siguen.user.js`](./ig-no-me-siguen.user.js) en
   modo *Raw*; Tampermonkey te ofrecerá instalarlo → **Instalar**.
   (O crea un script nuevo en Tampermonkey y pega el contenido.)
3. Entra en instagram.com → tu perfil → **Seguidos**.

### iPhone / iPad
1. Instala la app gratuita **Userscripts** (App Store) y actívala en
   *Ajustes → Safari → Extensiones*.
2. Copia `ig-no-me-siguen.user.js` en la carpeta de Userscripts.
3. Abre instagram.com en Safari → tu perfil → **Seguidos**.

### Android
1. Usa **Firefox** (o Kiwi/Edge Canary) e instala la extensión **Tampermonkey**.
2. Instala el script igual que en el ordenador.
3. Abre instagram.com → tu perfil → **Seguidos**.

## Notas
- **Cuentas grandes (miles de seguidores):** el panel muestra una barra de progreso y
  el tiempo estimado (≈1 min por cada 3.000 cuentas, más pausas). El progreso se guarda
  tras cada página: si cierras Safari, bloqueas el iPhone o Instagram te limita, vuelve
  a abrir **Seguidos** y continuará donde lo dejó (durante 24 h).
- Si Instagram pide ir más despacio (error 429), el script espera y reintenta solo;
  si sigue limitando, se detiene sin perder nada: espera 15–30 min y vuelve a Seguidos.
- Uso personal sobre tu propia cuenta; no lo uses de forma masiva ni automatizada.

## Desarrollo
El código está en `ig-no-me-siguen.user.js`. `extension/content.js` es una copia
para la extensión: tras editar el userscript ejecuta `./macos/sync-extension.sh`.

## Si no funciona
1. **¿Ves el botón azul 👥 abajo a la izquierda en instagram.com?**
   - **No:** el script no está cargado. En iPhone: *Ajustes → Safari → Extensiones →
     Userscripts* → actívala y en *instagram.com* elige **Permitir**. Comprueba también
     que el archivo esté en la carpeta de Userscripts y activado en la app.
   - **Sí:** tócalo. Si algo falla, el panel muestra el error (p. ej. `HTTP 401`).
2. Asegúrate de tener la sesión iniciada en instagram.com **en Safari** (no basta con la app).
