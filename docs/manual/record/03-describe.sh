# Section describe (chapter 3). Sourced by ../capture.sh.
# ---- Describe it -----------------------------------------------------------------------------------------------------
# fill <file> <the blank's words> <what the designer writes there>: one Blueprint.todo replaced, or the recording stops.
fill() {
  node -e 'const fs=require("node:fs"),[file,blank,answer]=process.argv.slice(1),text=fs.readFileSync(file,"utf8"),todo="Blueprint.todo("+JSON.stringify(blank)+")";if(!text.includes(todo))throw new Error("the blank is not where the recording expects it: "+blank);fs.writeFileSync(file,text.replace(todo,answer))' "$app/$1" "$2" "$3"
}
# The designer declares what the plan page names: one thing and one operation. Every gap is a blank.
ortho describe-add-thing.txt add thing wallet
ortho describe-add-operation.txt add operation wallet.open
copy describe-0-thing.ts.txt blueprint/things/wallet/thing.ts
copy describe-0-machine.ts.txt blueprint/things/wallet/machine.ts
copy describe-0-open.ts.txt blueprint/things/wallet/verbs/open.ts
ortho describe-0-check.txt check
ortho describe-0-model.txt model
# Two blanks whose answer is on the plan page (captures/plan-page.txt, "Things"): what a wallet is, and its states.
fill blueprint/things/wallet/thing.ts "what a wallet is, in one sentence" "\"A handle's money, one for each claimed handle.\""
fill blueprint/things/wallet/machine.ts "the states a wallet can be in, the first one where it starts" '["opening", "open", "frozen", "closed"]'
copy describe-1-thing.ts.txt blueprint/things/wallet/thing.ts
copy describe-1-machine.ts.txt blueprint/things/wallet/machine.ts
ortho describe-1-check.txt check
# Generate with five blanks left: it neither refuses nor waits. Then the check again, and the model.
ortho describe-2-generate.txt generate
ortho describe-2-check.txt check
ortho describe-2-model.txt model
# Is there a handler for the unfinished operation? Recorded as a listing, so the chapter can say so.
rec describe-2-handlers.txt "ls src" -- ls src
restore
# What goes wrong: generate run before the wallet has any state. The file it writes does not compile, and check says so.
(cd "$app" && node "$repo/packages/cli/src/main.ts" add thing wallet > /dev/null)
ortho describe-early-generate.txt generate
ortho describe-early-check.txt check
copy describe-early-types.ts.txt generated/sdk/src/wallet/types.ts
restore
