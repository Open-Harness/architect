# Section watch (chapter 9). Sourced by ../capture.sh. It starts the long-lived test environment and stops it again.
# ---- Watch it --------------------------------------------------------------------------------------------------------
# `ortho dev` records where watch does not read, so the calls are made to the test environment, which keeps a Collector of
# its own. If the section fails half way the environment is still stopped: the trap is capture.sh's own, with that put first.
tool() { (cd "$app" && node "$repo/packages/cli/src/main.ts" "$@"); }
forget_test() { rm -rf "$app/.ortho/environments/test" "$app/.ortho/tasks"; }
trap 'tool env down test > /dev/null 2>&1 || true; forget_test; finish' EXIT
read_page() { curl -s -o /dev/null -X POST "$url/profile/get" -H content-type:application/json -d '{"handle":"firstpage"}'; }
forget_test
# The budgets as a full prove judges them, and what watch makes of the traces that run left.
ortho watch-prove.txt prove
# Three calls to the app as `ortho dev` runs it. They are real calls, and the next watch does not count them.
start_app
for _ in 1 2 3; do read_page; done
sleep 5 # the Collector writes its files a moment after the call
stop
rm "$out/dev.txt" # chapter 7's recording, which this section does not replace
ortho watch-local.txt watch --env local
ortho watch-local-up.txt env up local
# An environment that has recorded nothing, then the same one started.
ortho watch-nothing.txt watch --env test
# An environment runs a committed revision, so it is refused while anything is uncommitted: here, one stray file.
echo "a note to self" > "$app/notes.txt"
ortho watch-up-uncommitted.txt env up test --port "$port"
rm "$app/notes.txt"
ortho watch-up.txt env up test --port "$port"
# A little real traffic: a name claimed, a second one refused, the public page read three times.
sign_in aaron
cli watch-claim-first.txt handle claim --name firstpage
cli watch-claim-second.txt handle claim --name secondpage
for _ in 1 2 3; do read_page; done
sleep 5 # the Collector writes its files a moment after the call
ortho watch-healthy.txt watch --env test
# Nothing here is slow, so to see drift the budget of one operation is tightened, from 150 ms to 10 ms. Restored below.
sed -i 's/budget: { p95: "150 millis" }/budget: { p95: "10 millis" }/' "$app/blueprint/things/profile/verbs/get.ts"
grep -q '"10 millis"' "$app/blueprint/things/profile/verbs/get.ts" || { echo "the budget is not where the recording expects it" >&2; exit 1; }
ortho watch-thin.txt watch --env test
for _ in $(seq 25); do read_page; done
sleep 5
ortho watch-drift.txt watch --env test
copy watch-task.md.txt .ortho/tasks/drift-test-profile.get.md
slowest="$(grep -o 'ortho telemetry trace [0-9a-f]*' "$out/watch-task.md.txt" | head -1 | cut -d' ' -f4)"
ortho watch-slowest.txt telemetry trace "$slowest" --env test
# The budget as the blueprint has it again: the same calls, judged against 150 ms.
restore
ortho watch-back.txt watch --env test
ortho watch-down.txt env down test
forget_token
forget_test
trap finish EXIT
