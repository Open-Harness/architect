#!/usr/bin/env bash
# Records what really happens on examples/plugged-in, into captures/. The manual's chapters and their films quote these files and
# invent no output. Each file opens with the command that was run, as `$ …`, then what it printed. A last line `exit N` is written
# by this script when the command ended with a status other than zero; the command did not print it.
#   docs/manual/capture.sh                 every section
#   docs/manual/capture.sh stub trace      only those sections; the other recordings are kept
# A section is one file, record/NN-<section>.sh, numbered by its chapter and run in that order. A chapter adds its own file and
# touches nothing else here. Each section starts from a clean example and must leave it clean (call restore).
# Every edit it makes to the example is undone on the way out, whether it finishes or fails, and the app it starts is stopped by
# process group. It records into a folder of its own and replaces the committed recordings only when a whole run succeeds.
# Needs Node 24, an installed workspace, and setsid (Linux). The whole run takes about two minutes.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; repo="$(cd "$here/../.." && pwd)"; app="$repo/examples/plugged-in"
# The example must be clean before anything here can touch it: this check comes before the trap that restores it.
[ -z "$(git -C "$repo" status --porcelain examples/plugged-in)" ] || { echo "examples/plugged-in has changes: commit or stash them first" >&2; exit 1; }
port="${MANUAL_PORT:-4517}"; url="http://127.0.0.1:$port"; dev=""; keep="$(mktemp -d)"; out="$keep/captures"; mkdir -p "$out"
sections=" $* "; wants() { [ "$sections" = "  " ] && return 0; case "$sections" in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
restore() { git -C "$repo" checkout -- examples/plugged-in; git -C "$repo" clean -fdq -- examples/plugged-in; }
stop() { [ -z "$dev" ] || { kill -INT -- "-$dev" 2>/dev/null || true; sleep 2; kill -- "-$dev" 2>/dev/null || true; dev=""; }; }
finish() { stop; restore; rm -rf "$keep"; }
trap finish EXIT

# rec <file> <the command as a reader types it> -- <the command as it is run here>
rec() { local file="$1" shown="$2"; shift 3; { echo "\$ $shown"; (cd "$app" && "$@" 2>&1) || echo "exit $?"; } > "$out/$file"; }
shown() { local said="$1" word; shift; for word in "$@"; do case "$word" in *" "*) said+=" \"$word\"" ;; *) said+=" $word" ;; esac; done; echo "$said"; }
ortho() { rec "$1" "$(shown ortho "${@:2}")" -- node "$repo/packages/cli/src/main.ts" "${@:2}"; }
copy() { { echo "# $2"; cat "$app/$2"; } > "$out/$1"; }

# For a section that runs the app: start_app, sign_in <test person>, then cli (the generated tool) and post (a signed call
# over HTTP), then stop and forget_token. The app runs in a process group of its own, so stopping it stops what it started.
start_app() {
  (cd "$app" && exec setsid node "$repo/packages/cli/src/main.ts" dev --port "$port" > "$keep/dev.txt" 2>&1) & dev=$!
  for _ in $(seq 60); do grep -q "running at" "$keep/dev.txt" 2>/dev/null && curl -fs "$url/_world/health" > /dev/null 2>&1 && break; sleep 1; done
  { echo "\$ ortho dev --port $port"; sed "s#$app#examples/plugged-in#g" "$keep/dev.txt"; } > "$out/dev.txt"
}
# No command signs a test person in to a local app yet. Journeys ask the local world's own door, and so does a recording.
# The token is kept in a variable: it is never printed, never written, and never on a command line another process can read.
sign_in() {
  token="$(curl -fs -X POST "$url/_world/cast" -H content-type:application/json -d "{\"names\":[\"$1\"]}" | node -pe "JSON.parse(require('node:fs').readFileSync(0,'utf8'))['$1'].token")"
  [ "${#token}" -ge 16 ] || { echo "the local world gave no session for the test person" >&2; exit 1; }
  export PLUGGED_IN_URL="$url" PLUGGED_IN_TOKEN="$token"
}
cli() { rec "$1" "plugged-in ${*:2}" -- node generated/cli/src/main.ts "${@:2}"; }
post() { printf 'authorization: Bearer %s\n' "$token" | curl -si -X POST "$url/$1" -H @- -H content-type:application/json -d "$2" | tr -d '\r'; echo; }
forget_token() {
  for file in "$out"/*; do case "$(< "$file")" in *"$token"*) echo "a token reached the recordings: nothing is kept" >&2; exit 1 ;; esac; done
  unset PLUGGED_IN_TOKEN token
}

for file in "$here"/record/*.sh; do
  name="$(basename "$file" .sh)"; name="${name#*-}"
  if wants "$name"; then source "$file"; restore; fi
done

mkdir -p "$here/captures"; cp "$out"/* "$here/captures/"
echo "captured: $(ls "$out" | tr '\n' ' ')"
