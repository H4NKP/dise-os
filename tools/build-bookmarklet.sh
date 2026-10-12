#!/bin/bash
# Genera bookmarklet.txt (versión marcador del script, sin extensiones). Requiere Node.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
npx --yes terser@5.31.0 "$ROOT/ig-no-me-siguen.user.js" --compress --mangle \
  -o "$ROOT/tools/.min.js"
node -e 'const fs=require("fs");fs.writeFileSync(process.argv[2],"javascript:"+encodeURIComponent("window.__igNoMeSiguenBookmarklet=1;"+fs.readFileSync(process.argv[1],"utf8").trim())+"\n")' \
  "$ROOT/tools/.min.js" "$ROOT/bookmarklet.txt"
rm "$ROOT/tools/.min.js"
echo "bookmarklet.txt: $(wc -c < "$ROOT/bookmarklet.txt") bytes"
