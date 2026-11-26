#!/usr/bin/env bash
# Records what `ortho` really prints on examples/plugged-in, into captures/. The film replays these files; it invents no output.
# Every edit it makes to the example is undone on the way out, whether it finishes or fails. Needs Node 24 and an installed workspace.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; repo="$(cd "$here/../.." && pwd)"; app="$repo/examples/plugged-in"; out="$here/films/how-it-works/captures"
ortho() { (cd "$app" && node "$repo/packages/cli/src/main.ts" "$@" 2>&1) || true; }
restore() { git -C "$repo" checkout -- examples/plugged-in; }
# The example must be clean before anything here can touch it, so this check comes before the trap that restores it.
[ -z "$(git -C "$repo" status --porcelain examples/plugged-in)" ] || { echo "examples/plugged-in has changes: commit or stash them first" >&2; exit 1; }
trap restore EXIT
mkdir -p "$out"

ortho check > "$out/check.txt"
ortho brief handle.claim > "$out/brief.txt"

# A generated file edited by hand: the drift check names it.
echo "// my little tweak" >> "$app/generated/sdk/src/handle/claim.ts"
ortho check > "$out/drift.txt"; restore

# The climb's first rung: the claim handler with its behaviour taken out.
node - "$app/src/handle/claim.ts" <<'JS'
const fs = require("node:fs"); const file = process.argv[2]; const text = fs.readFileSync(file, "utf8");
const empty = `const claim: Handler = (_payload, { id }) =>\n  Effect.gen(function* () {\n    // TODO: the behaviour.\n    return { handle: id };\n  });\n\nexport default claim;\n`;
fs.writeFileSync(file, text.slice(0, text.indexOf("const claim: Handler")) + empty);
JS
ortho prove > "$out/prove-red.txt"; restore
ortho prove > "$out/prove-green.txt"

# A change to the blueprint: claim's budget and description.
sed -i 's/Claim a free name and make it the address of your public page, with its profile\./Claim a free name. It becomes the address of your public page./; s/150 millis/100 millis/' "$app/blueprint/things/handle/verbs/claim.ts"
git -C "$repo" diff --no-color -U0 -- examples/plugged-in/blueprint > "$out/change.diff"
ortho check > "$out/change-check.txt"
ortho impact > "$out/change-impact.txt"
ortho generate > "$out/change-generate.txt"
ortho prove --changed > "$out/change-prove-changed.txt"
ortho prove > "$out/change-prove.txt"
ortho impact > "$out/change-impact-after.txt"
echo "captured: $(ls "$out" | tr '\n' ' ')"
