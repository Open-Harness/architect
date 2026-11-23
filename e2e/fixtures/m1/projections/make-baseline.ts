// Writes `acme-baseline.json` from acme's checked-in `generated/` (run once, on m1 before any mount exists):
//   node e2e/fixtures/m1/projections/make-baseline.ts
// It is the record of what "unchanged" means for M1.11, so it is not run again once a projection is mounted. Recaptured once, on 20 November 2026,
// from acme as it is on goal-3/han-10-build at bba668ed (HAN-10, #117): four api files (errors.ts, allowance/grant.ts, allowance/spend.ts,
// organization/create.ts) and the model's digest differ from the earlier record, each only by `IdempotencyConflict`. Recaptured again on 21 November 2026, from acme as it is on goal-3/s31-build at d062b8b2 (S-31, #255): only the model's digest moved, the model
// now carries each operation's `breaks`.
import { writeFileSync } from "node:fs";
import { acme } from "../../../layer1/support.ts";
import { baselinePath, digestOf, modelDigest, type Baseline } from "../../../m1/projections.ts";

const files = { ...digestOf(acme, "server"), ...digestOf(acme, "api") };
const out: Baseline = { files, model: modelDigest(acme) };
writeFileSync(baselinePath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${Object.keys(files).length} files`);
