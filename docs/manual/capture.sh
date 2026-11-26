#!/usr/bin/env bash
# Records what really happens on examples/plugged-in, into captures/. The manual's chapters and their films quote these files and
# invent no output. Each file opens with the command that was run, as `$ …`, then what it printed. A last line `exit N` is written
# by this script when the command ended with a status other than zero; the command did not print it.
#   docs/manual/capture.sh                 every section
#   docs/manual/capture.sh stub trace      only those sections (cli, journeys, stub, climb, trace); the other recordings are kept
# Every edit it makes to the example is undone on the way out, whether it finishes or fails, and the app it starts is stopped by
# process group. It records into a folder of its own and replaces the committed recordings only when a whole run succeeds.
# Needs Node 24, an installed workspace, and setsid (Linux). The whole run takes about two minutes.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; repo="$(cd "$here/../.." && pwd)"; app="$repo/examples/plugged-in"
# The example must be clean before anything here can touch it: this check comes before the trap that restores it.
[ -z "$(git -C "$repo" status --porcelain examples/plugged-in)" ] || { echo "examples/plugged-in has changes: commit or stash them first" >&2; exit 1; }
port="${MANUAL_PORT:-4517}"; url="http://127.0.0.1:$port"; dev=""; keep="$(mktemp -d)"; out="$keep/captures"; mkdir -p "$out"
sections=" ${*:-cli journeys stub climb trace} "; wants() { case "$sections" in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
restore() { git -C "$repo" checkout -- examples/plugged-in; git -C "$repo" clean -fdq -- examples/plugged-in; }
stop() { [ -z "$dev" ] || { kill -INT -- "-$dev" 2>/dev/null || true; sleep 2; kill -- "-$dev" 2>/dev/null || true; dev=""; }; }
finish() { stop; restore; rm -rf "$keep"; }
trap finish EXIT

# rec <file> <the command as a reader types it> -- <the command as it is run here>
rec() { local file="$1" shown="$2"; shift 3; { echo "\$ $shown"; (cd "$app" && "$@" 2>&1) || echo "exit $?"; } > "$out/$file"; }
shown() { local said="$1" word; shift; for word in "$@"; do case "$word" in *" "*) said+=" \"$word\"" ;; *) said+=" $word" ;; esac; done; echo "$said"; }
ortho() { rec "$1" "$(shown ortho "${@:2}")" -- node "$repo/packages/cli/src/main.ts" "${@:2}"; }
copy() { { echo "# $2"; cat "$app/$2"; } > "$out/$1"; }

# The command line's own tree, read from its --help: what check.mjs holds every written command against.
if wants cli; then node "$here/cli-tree.mjs" > "$out/cli.json"; fi

# ---- Say what done means ---------------------------------------------------------------------------------------------
if wants journeys; then
  # The designer's last step: a stub for each path, role and declared error of one thing. Each is a file of blanks.
  ortho stubs.txt add journeys handle
  copy stub-refused-not-owner.ts.txt blueprint/journeys/handle-release-refused-not-handleOwner.ts
  ortho stubs-check.txt check
  restore
  # The journeys as they stand, run on the scaffolded handlers: red on purpose.
  ortho prove-empty.txt prove --empty
  ortho prove-empty-one.txt prove --empty --only "claim a handle"
fi
if wants stub; then
  # One new journey by name: its stub has a blank cast, and the commands that read the model stop on it. The stack's own
  # lines are left out, and this checkout's path is cut from the ones that stay.
  ortho stub-one.txt add journey a-released-name-is-free-again
  rec stub-one-check.txt "ortho check" -- bash -c "node '$repo/packages/cli/src/main.ts' check 2>&1 | grep -v '^ *at ' | sed 's#file://$repo/##g; s#$repo/##g' | head -12; exit \${PIPESTATUS[0]}"
  restore
fi

# ---- Build until green -----------------------------------------------------------------------------------------------
if wants climb; then
  ortho brief.txt brief handle.claim
  # Rung 0: the scaffold `ortho generate` writes when the handler is not there.
  mv "$app/src/handle/claim.ts" "$keep/claim.ts"
  ortho climb-0-generate.txt generate
  copy climb-0-handler.ts.txt src/handle/claim.ts
  ortho climb-0-prove.txt prove --only "claim a handle"
  # Rung 1: the records are written, and the move is forgotten.
  node -e 'const fs=require("node:fs"),[from,to]=process.argv.slice(1),text=fs.readFileSync(from,"utf8"),cut=text.replace(/\n    \/\/ The move claim, to claimed\.\n    yield\* move\(\);\n/,"\n");if(cut===text)throw new Error("the move is not where the recording expects it");fs.writeFileSync(to,cut)' "$keep/claim.ts" "$app/src/handle/claim.ts"
  copy climb-1-handler.ts.txt src/handle/claim.ts
  ortho climb-1-prove.txt prove --only "claim a handle"
  # Rung 2: the handler as it is in the repository.
  cp "$keep/claim.ts" "$app/src/handle/claim.ts"
  copy climb-2-handler.ts.txt src/handle/claim.ts
  ortho climb-2-prove.txt prove --only "claim a handle"
  restore
  ortho prove.txt prove
  ortho check.txt check
fi

# ---- Run it, break it, read the trace --------------------------------------------------------------------------------
if wants trace; then
  # The app runs in a process group of its own, so stopping it stops what it started too.
  (cd "$app" && exec setsid node "$repo/packages/cli/src/main.ts" dev --port "$port" > "$keep/dev.txt" 2>&1) & dev=$!
  for _ in $(seq 60); do grep -q "running at" "$keep/dev.txt" 2>/dev/null && curl -fs "$url/_world/health" > /dev/null 2>&1 && break; sleep 1; done
  { echo "\$ ortho dev --port $port"; sed "s#$app#examples/plugged-in#g" "$keep/dev.txt"; } > "$out/dev.txt"
  # No command signs a test person in to a local app yet. Journeys ask the local world's own door, and so does this recording.
  # The token is kept in a variable: it is never printed, never written, and never on a command line another process can read.
  token="$(curl -fs -X POST "$url/_world/cast" -H content-type:application/json -d '{"names":["aaron"]}' | node -pe 'JSON.parse(require("node:fs").readFileSync(0,"utf8")).aaron.token')"
  [ "${#token}" -ge 16 ] || { echo "the local world gave no session for the test person" >&2; exit 1; }
  export PLUGGED_IN_URL="$url" PLUGGED_IN_TOKEN="$token"
  cli() { rec "$1" "plugged-in ${*:2}" -- node generated/cli/src/main.ts "${@:2}"; }
  post() { printf 'authorization: Bearer %s\n' "$token" | curl -si -X POST "$url/$1" -H @- -H content-type:application/json -d "$2" | tr -d '\r'; echo; }
  cli claim-first.txt handle claim --name firstpage
  cli claim-second.txt handle claim --name secondpage
  # The same refused call over HTTP, to read the trace's id from the answer's headers.
  { echo "\$ curl -i -X POST $url/handle/claim -H 'authorization: Bearer <token>' -H 'content-type: application/json' -d '{\"name\":\"secondpage\"}'"; post handle/claim '{"name":"secondpage"}'; } > "$out/refusal-http.txt"
  refused="$(sed -n 's/^x-trace-id: //p' "$out/refusal-http.txt")"
  # A call that is answered, to read beside the refused one: the public page.
  { echo "\$ curl -i -X POST $url/profile/get -H 'content-type: application/json' -d '{\"handle\":\"firstpage\"}'"
    curl -si -X POST "$url/profile/get" -H content-type:application/json -d '{"handle":"firstpage"}' | tr -d '\r'; echo; } > "$out/answer-http.txt"
  answered="$(sed -n 's/^x-trace-id: //p' "$out/answer-http.txt")"
  sleep 4 # the Collector writes its files a moment after the call
  ortho trace-refused.txt telemetry trace "$refused"
  ortho trace-answered.txt telemetry trace "$answered"
  stop
  for file in "$out"/*; do case "$(< "$file")" in *"$token"*) echo "a token reached the recordings: nothing is kept" >&2; exit 1 ;; esac; done
  unset PLUGGED_IN_TOKEN token
fi

mkdir -p "$here/captures"; cp "$out"/* "$here/captures/"
echo "captured: $(ls "$out" | tr '\n' ' ')"
