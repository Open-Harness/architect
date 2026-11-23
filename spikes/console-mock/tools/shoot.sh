#!/usr/bin/env bash
# Renders the pages, swaps the canvas blob links for local CSS, and screenshots each page headless at desktop width.
# Usage: tools/shoot.sh [Name ...]   (needs bun, Chrome, and internal/portal-pro/node_modules installed in the main checkout)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
pro="${PORTAL_PRO:-$here/../../internal/portal-pro}"
[ -d "$here/src/node_modules" ] || ln -s "$pro/node_modules" "$here/src/node_modules"
out="$here/out"; mkdir -p "$out"
cp "$pro/node_modules/@heroui/styles/dist/heroui.min.css" "$out/heroui.css"
cp "$pro/node_modules/@heroui-pro/react/dist/heroui-pro.min.css" "$out/heroui-pro.css"
(cd "$here/src" && bun render.tsx "$out" "$@")
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for f in "$out"/*.dc.html; do
  name="$(basename "$f" .dc.html)"
  h="$(grep -o '"height":[0-9]*' "$f" | head -1 | cut -d: -f2)"
  sed -e 's#/_blob/3d919fd818506a14aa401243b3e69241#heroui.css#' -e 's#/_blob/f30f6291464f81bf7dfbe0a4c38de8f0#heroui-pro.css#' "$f" > "$out/$name.preview.html"
  "$chrome" --headless=new --hide-scrollbars --window-size="1440,${h:-1400}" --screenshot="$out/$name.png" "file://$out/$name.preview.html" 2>/dev/null
  echo "$out/$name.png"
done
