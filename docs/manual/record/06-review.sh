# Section review (chapter 6). Sourced by ../capture.sh. Nothing here listens on a port of its own: prove picks a free one.
# ---- Review without reading the code ---------------------------------------------------------------------------------
# `ortho impact` compares with the record the last prove left in the ignored .ortho/ folder, which `restore` does not clean.
# So the section starts as a fresh checkout does, with no record, and ends the same way.
ledger="$app/.ortho/evidence/proven.json"
rm -f "$ledger"
ortho review-impact-fresh.txt impact
# The reviewer's machine before the change: one full proof, and nothing stale.
ortho review-prove-before.txt prove
ortho review-impact-before.txt impact
# The change, as a designer would make it: two lines of claim's declaration, its description and its time budget.
sed -i 's/Claim a free name and make it the address of your public page, with its profile\./Claim a free name. It becomes the address of your public page./; s/150 millis/100 millis/' "$app/blueprint/things/handle/verbs/claim.ts"
[ -n "$(git -C "$repo" status --porcelain examples/plugged-in/blueprint)" ] || { echo "the change is not where the recording expects it" >&2; exit 1; }
# Handed over too early, before generate: the check names every generated file that is behind.
ortho review-check-early.txt check
ortho review-generate.txt generate
# What the reviewer reads, in order: the blueprint's part of the change, every file it touched, and what went stale.
rec review-diff.txt "git diff -U0 --relative -- blueprint" -- git --no-pager diff --no-color -U0 --relative -- blueprint
rec review-stat.txt "git diff --stat --relative" -- git --no-pager diff --no-color --stat --relative
ortho review-impact.txt impact
# Then it runs the proof and the check itself, and asks again.
ortho review-prove.txt prove
ortho review-check.txt check
ortho review-impact-after.txt impact
# A change that says nothing in the blueprint: one comment line added to the handler, and no declaration moved.
echo "// one more line, in a handler nobody was asked to touch" >> "$app/src/handle/claim.ts"
ortho review-impact-handler.txt impact
restore
rm -f "$ledger"
