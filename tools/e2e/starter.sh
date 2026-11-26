#!/usr/bin/env bash
# The starter, the way a user gets it: publish Orthograph's packages to a local Verdaccio, create a workspace with
# `create-nx-workspace --preset=@orthograph/preset`, then `ortho check` and `ortho prove --env local` in it.
# The registry is Verdaccio under Node (the pinned `verdaccio` package), a process of this script: no container. Leaves nothing
# running: the registry is stopped, and its storage and the workspace are removed, on any exit.
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
port=${ORTHO_E2E_REGISTRY_PORT:-4880}
name=${ORTHO_E2E_NAME:-bakery}
registry="http://127.0.0.1:$port/"
registry_pid=""
marker=""
work=$(mktemp -d "${TMPDIR:-/tmp}/ortho-e2e.XXXXXX")

cleanup() {
  status=$?
  if [ "$status" -ne 0 ] && [ -f "$work/$name/pnpm-workspace.yaml" ]; then
    printf '\n== failed (%s); the workspace pnpm-workspace.yaml was:\n' "$status"; cat "$work/$name/pnpm-workspace.yaml"
  fi
  if [ -n "$registry_pid" ]; then
    kill "$registry_pid" >/dev/null 2>&1 || true
    wait "$registry_pid" >/dev/null 2>&1 || true
  fi
  [ -z "$marker" ] || rm -f "$marker"
  rm -rf "$work"
}
trap cleanup EXIT

step() { printf '\n== %s\n' "$*"; }

step "build"
(cd "$repo" && NX_DAEMON=false pnpm nx run-many -t build --outputStyle=static >/dev/null)

step "registry on :$port"
mkdir -p "$work/storage"
sed -e "s#__STORAGE__#$work/storage#g" -e "s#__PORT__#$port#g" "$repo/tools/e2e/verdaccio.yaml" > "$work/verdaccio.yaml"
verdaccio_bin="$repo/node_modules/verdaccio/bin/verdaccio"
node "$verdaccio_bin" --config "$work/verdaccio.yaml" > "$work/registry.log" 2>&1 &
registry_pid=$!
# A gate's run folder names every process of ours by PID, so its teardown can see that none is left (see e2e/layer1/teardown.ts).
if [ -n "${ORTHO_RUN_DIR:-}" ]; then
  mkdir -p "$ORTHO_RUN_DIR"
  marker="$ORTHO_RUN_DIR/registry-$registry_pid.json"
  printf '{"kind":"registry","pid":%s,"owner":0,"command":"node %s --config %s","title":"verdaccio"}\n' "$registry_pid" "$verdaccio_bin" "$work/verdaccio.yaml" > "$marker"
fi
up=""
for _ in $(seq 120); do curl -sf "$registry-/ping" >/dev/null && up=yes && break; sleep 0.5; done
[ -n "$up" ] || { printf 'the registry did not answer; its log:\n'; tail -20 "$work/registry.log"; exit 1; }

# A throwaway user on this registry only; its token lives in a file inside $work and never reaches the output.
password=$(openssl rand -hex 16)
token=$(curl -sf -X PUT "$registry-/user/org.couchdb.user:e2e" -H 'content-type: application/json' \
  -d "{\"name\":\"e2e\",\"password\":\"$password\"}" | node -e 'process.stdin.on("data",d=>process.stdout.write(JSON.parse(d).token))')
printf '//127.0.0.1:%s/:_authToken=%s\n' "$port" "$token" > "$work/npmrc"
unset token password

# The preset's `prepack` (tools/release/starter.mjs) copies examples/starter into it as it is packed, and its `postpack` removes the copy.
step "publish"
for p in orthograph compiler language-effect chain-evm lint portal projections generators host-cloudflare logbook prove preset cli create-orthograph; do
  (cd "$repo/packages/$p" && NPM_CONFIG_USERCONFIG="$work/npmrc" pnpm publish --registry "$registry" --tag next --no-git-checks >/dev/null)
  echo "published $p"
done

export npm_config_registry="$registry" pnpm_config_registry="$registry"
# Every run publishes the same version again (0.1.0-next.<n>), so nothing may come from a cache another run filled.
export npm_config_cache="$work/npm-cache" pnpm_config_cache_dir="$work/pnpm-cache" pnpm_config_store_dir="$work/pnpm-store"
cd "$work"
step "create-nx-workspace $name --preset=@orthograph/preset"
npx --yes create-nx-workspace@24.0.3 "$name" --preset=@orthograph/preset --no-interactive \
  --nxCloud=skip --trustThirdPartyPreset --pm=pnpm --skipGit ${ORTHO_E2E_VERBOSE:+--verbose}

cd "$work/$name"
step "ortho check"
pnpm ortho check
step "ortho prove --env local"
pnpm ortho prove --env local
