// Runs the app projection's own code over Plugged In's model and writes what it renders to derived/ (the six files of generated/app/).
// Plugged In mounts no app projection, so this is the derived default, exactly as `goal-6/app-projection-build` works it out.
//   node tools/derive.mjs <repo-checkout-of-goal-6/app-projection-build> <plugged-in model.json> <out dir>
// (Node strips the types; the two files it imports use only `import type`.)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const [checkout, modelFile, out] = process.argv.slice(2).map((p) => resolve(p));
const base = `${checkout}/packages/projections/src/modules/app/internal/`;
const { viewOf } = await import(base + "view.ts");
const { renderApp } = await import(base + "render.ts");
const model = JSON.parse(readFileSync(modelFile, "utf8"));
mkdirSync(out, { recursive: true });
for (const f of renderApp(viewOf(model, "plugged-in"), model)) writeFileSync(`${out}/${f.path.replace("generated/app/", "")}`, f.content);
