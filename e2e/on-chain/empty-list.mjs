// The last step of `nx run e2e:on-chain` (Goal 4's done check): the ratchet is green when every failure is listed, so the check
// passes only when nothing is listed. Fails, naming each file, while `e2e/on-chain/expected-failing/` holds any.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "expected-failing");
const left = existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith(".")) : [];
if (left.length > 0) {
  console.error(`e2e:on-chain is not done: ${left.length} check(s) are still listed in e2e/on-chain/expected-failing/:\n${left.map((f) => `  ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("e2e:on-chain: nothing is listed as expected to fail");
