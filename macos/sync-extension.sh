#!/bin/bash
# Copia el userscript a la extensión (ejecútalo tras editar ig-no-me-siguen.user.js).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cp "$ROOT/ig-no-me-siguen.user.js" "$ROOT/extension/content.js" && echo "extension/content.js actualizado"
