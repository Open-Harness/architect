// Writes `acme-docs-baseline.json`: the sha256 of every file under acme's checked-in `generated/docs`, by its path from the project (check 21's control A).
//   node e2e/fixtures/m1/portal/make-baseline.ts
// Recaptured on 20 November 2026 from acme as it is on goal-3/han-10-build at bba668ed (HAN-10, #117), where each idempotent operation's docs list
// `IdempotencyConflict`; only allowance/grant.md, allowance/spend.md and organization/create.md differ from the earlier record, each by that refusal.
// Recaptured again on 20 November 2026 from acme as it is on goal-3/journey-docs-build at 337376b9 (#184, W2): each operation's page gains its
// `## Worked examples` section, 15 files, and no line outside that section moves.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { acme } from "../../../layer1/support.ts";

const files = (dir: string): ReadonlyArray<string> => readdirSync(join(acme, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`])).sort();
const digest = Object.fromEntries(files("generated/docs").map((path) => [path, createHash("sha256").update(readFileSync(join(acme, path))).digest("hex")]));
writeFileSync(join(import.meta.dirname, "acme-docs-baseline.json"), `${JSON.stringify(digest, null, 2)}\n`);
console.log(`${Object.keys(digest).length} files`);
