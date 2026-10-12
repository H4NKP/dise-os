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

### Ordenador (Chrome, Edge, Firefox, Safari)
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
- Si tienes miles de seguidores, el primer análisis tarda un poco (≈1 s por cada 100 cuentas).
- Si Instagram responde con error 429/401, espera un rato y vuelve a intentarlo.
- Uso personal sobre tu propia cuenta; no lo uses de forma masiva ni automatizada.
