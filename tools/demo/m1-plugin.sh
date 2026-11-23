#!/usr/bin/env bash
# Goal 3's demo: a fresh copy of examples/starter, one `ortho add feature` of the fixture feature @fixture/echo, then
# `ortho generate` and `ortho check`. Pass --prove to include local proof.
#
# The fixture is built for real, the way e2e/m1/packages.ts builds it: tsc declarations, esbuild to dist/, npm pack, the
# archive extracted into the copy's node_modules. Everything is made in a scratch folder that is removed at the end.
set -euo pipefail
repo="$(cd "$(dirname "$0")/../.." && pwd)"
prove=false; [ "${1:-}" = "--prove" ] && prove=true
work="$(mktemp -d "${TMPDIR:-/tmp}/ortho-demo-XXXXXX")"
trap 'rm -rf "$work"' EXIT
say() { printf '\n\033[1m$ %s\033[0m\n' "$*"; }

# 1. The fixture feature, built and packed.
build="$work/build/echo"; mkdir -p "$work/build"
cp -R "$repo/e2e/fixtures/m1/echo" "$build"; rm -rf "$build/variants"
mkdir -p "$build/node_modules/@orthograph"
ln -s "$repo/packages/orthograph" "$build/node_modules/orthograph"
ln -s "$repo/packages/language-effect" "$build/node_modules/@orthograph/language-effect"
ln -s "$repo/node_modules/effect" "$build/node_modules/effect"
ln -s "$repo/node_modules/@types" "$build/node_modules/@types"
cat > "$build/tsconfig.json" <<JSON
{ "extends": "$repo/tsconfig.base.json", "compilerOptions": { "noEmit": false, "declaration": true, "emitDeclarationOnly": true,
  "rootDir": "source", "outDir": "dist", "types": ["node"] }, "include": ["source/**/*.ts"] }
JSON
"$repo/node_modules/.bin/tsc" -p "$build/tsconfig.json"
(cd "$build" && find source -name '*.ts' -print0 | xargs -0 "$repo/packages/prove/node_modules/.bin/esbuild" --format=esm --platform=neutral \
  --outbase=source --outdir=dist --log-level=warning)
: > "$work/npmrc"
archive="$(cd "$build" && npm pack --ignore-scripts --offline --silent --pack-destination "$work" --userconfig "$work/npmrc" --cache "$work/npm-cache")"

# 2. A fresh copy of the starter, with the fixture installed as a package manager would (not mounted).
root="$work/starter"
mkdir -p "$root"
for part in blueprint generated src journeys package.json; do [ -e "$repo/examples/starter/$part" ] && cp -R "$repo/examples/starter/$part" "$root/"; done
mkdir -p "$root/node_modules/.bin" "$root/node_modules/@fixture/echo"
for entry in "$repo/examples/starter/node_modules/"*  "$repo/examples/starter/node_modules/".[!.]*; do
  [ -e "$entry" ] && [ "$(basename "$entry")" != ".bin" ] && ln -s "$entry" "$root/node_modules/$(basename "$entry")"
done
for tool in tsc oxlint; do printf '#!/bin/sh\nexec "%s" "$@"\n' "$repo/node_modules/.bin/$tool" > "$root/node_modules/.bin/$tool"; chmod +x "$root/node_modules/.bin/$tool"; done
tar -xzf "$work/$archive" --strip-components 1 -C "$root/node_modules/@fixture/echo"
node -e 'const f=process.argv[1],m=JSON.parse(require("fs").readFileSync(f,"utf8"));m.dependencies={...m.dependencies,"@fixture/echo":"^1.0.0"};require("fs").writeFileSync(f,JSON.stringify(m,null,2)+"\n")' "$root/package.json"
printf '{ "extends": "%s", "compilerOptions": { "typeRoots": ["%s", "%s"] }, "include": ["blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts"] }\n' \
  "$repo/examples/starter/tsconfig.json" "$repo/node_modules/@types" "$repo/examples/starter/node_modules" > "$root/tsconfig.json"

# 3. The demo itself.
ortho() { node "$repo/packages/cli/src/main.ts" "$@" --root "$root"; }
say "ortho add feature @fixture/echo"; ortho add feature @fixture/echo
say "cat blueprint/features/echo.ts"; cat "$root/blueprint/features/echo.ts"
say "ortho generate"; ortho generate
say "ortho check"; ortho check
if $prove; then say "ortho prove"; ortho prove
else printf '\n(Run with --prove to include local proof.)\n'; fi
