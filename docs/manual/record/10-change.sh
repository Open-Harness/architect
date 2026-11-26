# Section change (chapter 10). Sourced by ../capture.sh.
# ---- Change it, months later -----------------------------------------------------------------------------------------
# A full proof first, so there is a record to measure the change from. It is the run chapter 5 recorded, so it is not kept again.
(cd "$app" && node "$repo/packages/cli/src/main.ts" prove > /dev/null)
ortho change-impact-before.txt impact
# The change: a person may hold more than one name. The rule oneNamePerPerson goes, and the import it alone used.
node -e 'const fs=require("node:fs"),file=process.argv[1],text=fs.readFileSync(file,"utf8"),at=text.indexOf("\n// A person holds one claimed name at a time.\n"),cut=text.slice(0,at).replace("import { HandleAlreadyOwned, HandleTaken }","import { HandleTaken }");if(at<0||cut===text.slice(0,at))throw new Error("the rule is not where the recording expects it");fs.writeFileSync(file,cut)' "$app/blueprint/things/handle/invariants.ts"
rec change-diff.txt "git diff blueprint/things/handle/invariants.ts" -- git --no-pager diff --no-color -- blueprint/things/handle/invariants.ts
ortho change-impact.txt impact
ortho change-check.txt check
ortho change-generate.txt generate
ortho change-prove-changed.txt prove --changed
sed -i "s#$app#examples/plugged-in#g" "$out/change-prove-changed.txt" # the path of wrangler's log, without this machine's folders
# The app does not build: link.add found a person's page through the rule that is gone. To record what the journeys say next, a
# stand-in for its builder: the link goes on the oldest name the person holds. Nobody decided that, and no agent wrote it.
node -e 'const fs=require("node:fs"),file=process.argv[1],text=fs.readFileSync(file,"utf8"),next=text.replace("import { oneNamePerPerson } from \"../../blueprint/things/handle/invariants.ts\";","import { Handle } from \"../../blueprint/things/handle/thing.ts\";").replace("const page = yield* steps.load(records.findBy(oneNamePerPerson, who.person as never));","const held = yield* steps.load(records.list({ thing: Handle, where: { owner: who.person }, state: \"claimed\", order: \"oldest\", limit: 1, after: undefined }));\n    const page = held.items[0];");if(next.includes("oneNamePerPerson")||!next.includes("held.items[0]"))throw new Error("link.add is not as the recording expects it");fs.writeFileSync(file,next)' "$app/src/link/add.ts"
ortho change-check-after.txt check
ortho change-prove.txt prove
ortho change-version.txt version --next
ortho change-impact-after.txt impact
restore
# The record of the last proof is the changed app's. It is not the repository's app, so it is not left behind.
rm -f "$app/.ortho/evidence/proven.json"
