#!/usr/bin/env bash
# The whole spike, from a checkout of goal/superagent (where `ortho new adapter --from-openapi` lives, M5.07):
#   spikes/bridge-adapter/run.sh <goal/superagent checkout, installed with pnpm> [port]
# It fetches Bridge's published description, checks it is the one this spike read, runs the generator on it as
# published (it refuses), names its operations and runs it again, then starts the stand-in and runs the exercise.
# It writes only under <checkout>/.bridge-spike/ (so the generated client finds `effect`) and stops the stand-in it started.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
checkout="$(cd "$1" && pwd)"
port="${2:-4010}"
url="https://withbridge-image1-sv-usw2-monorail-openapi.s3.amazonaws.com/latest.json"
read_sha="9ce92ed1001a14e94d58b7ae915c532ac17cd20ff2986cbf12ca48cf6c4e2fb3"
work="$checkout/.bridge-spike"
rm -rf "$work" && mkdir -p "$work/as-published" "$work/named"

curl -sfL -o "$work/bridge.json" "$url"
sha="$(sha256sum "$work/bridge.json" | cut -d' ' -f1)"
[ "$sha" = "$read_sha" ] || echo "note: Bridge's description has changed since the spike read it ($sha)"

echo "== 1. as published"
(cd "$work/as-published" && node "$checkout/packages/cli/src/main.ts" new adapter bridge --from-openapi "$work/bridge.json") || echo "exit $?"

echo "== 2. with an operationId on each operation"
node "$here/name-operations.mjs" "$work/bridge.json" "$work/named.json"
start=$(date +%s%N)
(cd "$work/named" && node "$checkout/packages/cli/src/main.ts" new adapter bridge --from-openapi "$work/named.json")
echo "generated in $(( ($(date +%s%N) - start) / 1000000 )) ms; $(du -sk "$work/named/plugins/bridge" | cut -f1) KB"

echo "== 3. Bridge's own examples against Bridge's own schemas"
node "$here/judge-examples.mjs" "$work/named/plugins/bridge/src/runtime/json-schema.ts" "$work/bridge.json"

echo "== 4. against the stand-in"
node "$here/stand-in.mjs" "$work/bridge.json" "$port" > "$work/stand-in.log" 2>&1 &
stand_in=$!
trap 'kill $stand_in 2>/dev/null || true' EXIT
for _ in $(seq 50); do curl -sf "http://127.0.0.1:$port/__stand-in/log" >/dev/null && break; sleep 0.1; done
node "$here/exercise.mjs" "$work/named/plugins/bridge/src/client.ts" "http://127.0.0.1:$port"
