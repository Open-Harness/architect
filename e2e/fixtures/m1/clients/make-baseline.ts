// Writes `acme-baseline.json` from acme's checked-in `generated/` (first run on m1 at 3a99bd92, before the SDK has options; recaptured once after M1.35, below):
//   node e2e/fixtures/m1/clients/make-baseline.ts
// It is the record of what "unchanged" means for M1.12, so it is not run again once the clients carry them. Recaptured once, on 20 November 2026, after M1.35 removed `Errors.shown` for `refusals` (design/decisions/M1-clients-baseline.md).
import { writeFileSync } from "node:fs";
import { acme } from "../../../layer1/support.ts";
import { baselinePath, clientDigest, exportsOf, type ClientBaseline } from "../../../m1/clients.ts";

const out: ClientBaseline = { files: clientDigest(acme), exports: exportsOf(acme) };
writeFileSync(baselinePath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${Object.keys(out.files).length} files`);
