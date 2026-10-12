#!/bin/bash
# Convierte la extensión en una app de Safari para macOS y la compila.
# Requiere Xcode instalado (App Store) y haberlo abierto al menos una vez.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/macos/build"
APP_NAME="IG No Me Siguen"

cp "$ROOT/ig-no-me-siguen.user.js" "$ROOT/extension/content.js"
rm -rf "$OUT"

xcrun safari-web-extension-converter "$ROOT/extension" \
  --project-location "$OUT" \
  --app-name "$APP_NAME" \
  --bundle-identifier "com.h4nkp.ig-no-me-siguen" \
  --macos-only --swift --copy-resources --no-open --no-prompt --force

xcodebuild -project "$OUT/$APP_NAME/$APP_NAME.xcodeproj" \
  -scheme "$APP_NAME" -configuration Release \
  -derivedDataPath "$OUT/DerivedData" \
  CODE_SIGN_IDENTITY="-" CODE_SIGNING_REQUIRED=NO build

APP="$OUT/DerivedData/Build/Products/Release/$APP_NAME.app"
rm -rf "/Applications/$APP_NAME.app"
cp -R "$APP" /Applications/
open "/Applications/$APP_NAME.app"

cat <<MSG

✅ Instalada en /Applications/$APP_NAME.app

Último paso en Safari:
  1. Safari → Ajustes → Avanzado → marca "Mostrar funciones para desarrolladores web".
  2. Menú Desarrollo → "Permitir extensiones sin firmar" (se pide cada vez que abres Safari).
  3. Safari → Ajustes → Extensiones → activa "$APP_NAME" y permítela en instagram.com.
MSG
