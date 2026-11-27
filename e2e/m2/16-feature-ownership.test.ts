// Check 16 (#1134, CX-feature-ownership): `ortho check` refuses a feature writing another feature's thing, and lets the allowed ways through.
//
// Two feature packages are installed into a copy of acme, as a workspace installs them (a folder of TypeScript, linked into node_modules):
// `@fixture/ledger` owns the line, `gl-entry` (its `post` creates one; `get` reads one), and `@fixture/payroll` needs the ledger and owns the
// slip, `salary-slip`. The app mounts both. Payroll comes in four variants, each a real project the real command reads:
//  - `own`: payroll writes only its slip, and the app's own `posting.record` writes the ledger's line (the app is no feature);
//  - `step`: payroll's submit has a database step that names the line;
//  - `verb`: payroll adds a verb to the line, `gl-entry.accrue`, that creates it by the ledger's own move;
//  - `inner`: payroll's submit runs the ledger's `post` inside its commit (`Blueprint.step.operation`, gap 1, #1079).
//
// The contract judged, the same as the compiler's mounts/ownership*.test.ts on the model:
//  - `ortho check` on `step` and on `verb` fails, its model part refused, with one line naming the file that declares the write, the feature,
//    the operation, how it writes, the thing, the feature that owns it, and the owner's operation to run inside the commit instead; and
//    `ortho generate` refuses the same project;
//  - `own` and `inner` compile: `ortho generate` succeeds and `ortho check` refuses nothing in the model.
// Written by the checks author for Goal 16; a builder never edits this file and only removes lines from `expected-failing/16-feature-ownership.txt`.
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf } from "../layer1/support.ts";
import { run } from "./secrets-support.ts";

// ---- the feature packages ----

const manifest = (name: string, needs: ReadonlyArray<string>) => JSON.stringify({
  name: `@fixture/${name}`, version: "1.0.0", private: true, type: "module",
  orthograph: { kind: "feature", blueprint: "blueprint", src: "src" },
  exports: { ".": "./index.ts", "./blueprint/*.js": "./blueprint/*.ts", "./blueprint/*": "./blueprint/*", "./src/*.js": "./src/*.ts", "./src/*": "./src/*" },
  dependencies: { orthograph: "workspace:*", ...Object.fromEntries(needs.map((n) => [`@fixture/${n}`, "1.0.0"])) },
}, null, 2);
/** A handler that answers nothing: this check judges what compiles, never what runs. */
const HANDLER = `import { Effect } from "effect";\nexport default ((_payload: unknown, _context: unknown) => Effect.succeed({})) as never;\n`;
const descriptor = (description: string, needs: ReadonlyArray<string>) => `import { Blueprint } from "orthograph";
${needs.map((n) => `import ${n} from "@fixture/${n}";\n`).join("")}export default Blueprint.feature({ description: ${JSON.stringify(description)}${needs.length > 0 ? `, needs: [${needs.join(", ")}]` : ""} });
`;

const LEDGER: Readonly<Record<string, string>> = {
  "package.json": manifest("ledger", []),
  "index.ts": descriptor("The books.", []),
  "blueprint/things/gl-entry/thing.ts": `import { Blueprint } from "orthograph";
export const GlEntry = Blueprint.thing({ description: "One line of the general ledger.", fields: { id: Blueprint.id("gle"), memo: Blueprint.text({ max: 100 }) } });
`,
  "blueprint/things/gl-entry/events.ts": `import { Blueprint } from "orthograph";
import { GlEntry } from "./thing.ts";
export const LinePosted = Blueprint.event({ id: GlEntry.fields.id });
`,
  "blueprint/things/gl-entry/machine.ts": `import { Blueprint } from "orthograph";
import { GlEntry } from "./thing.ts";
import { LinePosted } from "./events.ts";
export const machine = Blueprint.machine(GlEntry, { states: ["posted"], moves: { post: { from: [], to: "posted", emits: LinePosted } }, notFrom: { exit: 70 } });
`,
  "blueprint/things/gl-entry/verbs/post.ts": `import { Blueprint } from "orthograph";
import { GlEntry } from "../thing.ts";
import { machine } from "../machine.ts";
export default Blueprint.operation(GlEntry, {
  description: "Post a line.",
  payload: { id: GlEntry.fields.id, memo: GlEntry.fields.memo },
  answer: {},
  move: machine.moves.post,
  allowed: [Blueprint.signedIn],
  steps: { save: Blueprint.step.database() },
});
`,
  "src/gl-entry/post.ts": HANDLER,
  "blueprint/things/gl-entry/verbs/get.ts": `import { Blueprint } from "orthograph";
import { GlEntry } from "../thing.ts";
export default Blueprint.read(GlEntry, { by: "id", fields: ["id", "memo", "state"], allowed: [Blueprint.signedIn] });
`,
};

type Variant = "own" | "step" | "verb" | "inner";

/** Payroll's submit's steps in each variant. */
const SUBMIT_STEPS: Readonly<Record<Variant, string>> = {
  own: `{ save: Blueprint.step.database() }`,
  step: `{ save: Blueprint.step.database(), lines: Blueprint.step.database({ writes: [GlEntry] }) }`,
  verb: `{ save: Blueprint.step.database() }`,
  inner: `{ save: Blueprint.step.database(), post: Blueprint.step.operation(post) }`,
};

const payroll = (variant: Variant): Readonly<Record<string, string>> => ({
  "package.json": manifest("payroll", ["ledger"]),
  "index.ts": descriptor("Payroll.", ["ledger"]),
  "blueprint/things/salary-slip/thing.ts": `import { Blueprint } from "orthograph";
export const SalarySlip = Blueprint.thing({ description: "What one person is paid for a period.", fields: { id: Blueprint.id("sls"), memo: Blueprint.text({ max: 100 }) } });
`,
  "blueprint/things/salary-slip/events.ts": `import { Blueprint } from "orthograph";
import { SalarySlip } from "./thing.ts";
export const SlipDrafted = Blueprint.event({ id: SalarySlip.fields.id });
export const SlipSubmitted = Blueprint.event({ id: SalarySlip.fields.id });
`,
  "blueprint/things/salary-slip/machine.ts": `import { Blueprint } from "orthograph";
import { SalarySlip } from "./thing.ts";
import { SlipDrafted, SlipSubmitted } from "./events.ts";
export const machine = Blueprint.machine(SalarySlip, {
  states: ["draft", "submitted"],
  moves: { draft: { from: [], to: "draft", emits: SlipDrafted }, submit: { from: ["draft"], to: "submitted", emits: SlipSubmitted } },
  notFrom: { exit: 72 },
});
`,
  "src/salary-slip/draft.ts": HANDLER,
  "src/salary-slip/submit.ts": HANDLER,
  "blueprint/things/salary-slip/verbs/draft.ts": `import { Blueprint } from "orthograph";
import { SalarySlip } from "../thing.ts";
import { machine } from "../machine.ts";
export default Blueprint.operation(SalarySlip, {
  description: "Draft a slip.",
  payload: { id: SalarySlip.fields.id, memo: SalarySlip.fields.memo },
  answer: {},
  move: machine.moves.draft,
  allowed: [Blueprint.signedIn],
  steps: { save: Blueprint.step.database() },
});
`,
  "blueprint/things/salary-slip/verbs/submit.ts": `import { Blueprint } from "orthograph";
import { GlEntry } from "@fixture/ledger/blueprint/things/gl-entry/thing.ts";
import post from "@fixture/ledger/blueprint/things/gl-entry/verbs/post.ts";
import { SalarySlip } from "../thing.ts";
import { machine } from "../machine.ts";
void GlEntry; void post;
export default Blueprint.operation(SalarySlip, {
  description: "Submit a slip.",
  payload: { id: SalarySlip.fields.id },
  answer: {},
  move: machine.moves.submit,
  allowed: [Blueprint.signedIn],
  steps: ${SUBMIT_STEPS[variant]},
});
`,
  ...(variant === "verb" ? {
    // A folder with verbs and no thing.ts adds an operation to the ledger's line: payroll's, creating the line by the ledger's own move.
    "src/gl-entry/accrue.ts": HANDLER,
    "blueprint/things/gl-entry/verbs/accrue.ts": `import { Blueprint } from "orthograph";
import { GlEntry } from "@fixture/ledger/blueprint/things/gl-entry/thing.ts";
import { machine } from "@fixture/ledger/blueprint/things/gl-entry/machine.ts";
export default Blueprint.operation(GlEntry, {
  description: "Accrue a line straight into the books.",
  payload: { id: GlEntry.fields.id, memo: GlEntry.fields.memo },
  answer: {},
  move: machine.moves.post,
  allowed: [Blueprint.signedIn],
  steps: { save: Blueprint.step.database() },
});
`,
  } : {}),
});

// ---- the app's own posting, which writes the ledger's line: the app is no feature, and may ----

const APP: Readonly<Record<string, string>> = {
  ...Object.fromEntries(["ledger", "payroll"].map((n) => [`blueprint/features/${n}.ts`, `import { Blueprint } from "orthograph";\nimport plugin from "@fixture/${n}";\n\nexport default Blueprint.use(plugin, (_p) => []);\n`])),
  "blueprint/things/posting/thing.ts": `import { Blueprint } from "orthograph";
export const Posting = Blueprint.thing({ description: "A posting the app keeps.", fields: { id: Blueprint.id("pst"), memo: Blueprint.text({ max: 100 }) } });
`,
  "blueprint/things/posting/verbs/record.ts": `import { Blueprint } from "orthograph";
import { GlEntry } from "@fixture/ledger/blueprint/things/gl-entry/thing.ts";
import { Posting } from "../thing.ts";
export default Blueprint.operation(Posting, {
  description: "Record a posting, and its line in the books.",
  payload: { posting: Blueprint.id("pst"), memo: Posting.fields.memo },
  answer: { posting: Posting.fields.id },
  allowed: [Blueprint.signedIn],
  steps: { save: Blueprint.step.database({ writes: [Posting, GlEntry] }) },
});
`,
};

interface App { readonly root: string; readonly remove: () => void }
const apps: Array<App> = [];
afterEach(() => { for (const app of apps.splice(0)) app.remove(); });

const write = (root: string, files: Readonly<Record<string, string>>) => {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
};

/** A copy of acme with both packages installed and mounted, payroll in `variant`. Nothing is generated yet. */
const app = (variant: Variant): App => {
  const copy = copyOf(acme);
  apps.push(copy);
  mkdirSync(join(copy.root, "node_modules/@fixture"), { recursive: true });
  for (const [name, files] of [["ledger", LEDGER], ["payroll", payroll(variant)]] as const) {
    write(join(copy.root, "plugins", name), files);
    symlinkSync(join(copy.root, "plugins", name), join(copy.root, "node_modules/@fixture", name));
  }
  const pkg = JSON.parse(readFileSync(join(copy.root, "package.json"), "utf8")) as { dependencies: Record<string, string> };
  for (const name of ["ledger", "payroll"]) pkg.dependencies[`@fixture/${name}`] = "1.0.0";
  writeFileSync(join(copy.root, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  write(copy.root, APP);
  return copy;
};

const OWNERSHIP = "writes only its own things";

/** `ortho check` and `ortho generate` both refuse the project, and the check says, on one line, word for word, who writes what and what to run instead (call 6). */
const refused = (variant: "step" | "verb", path: string, s: { readonly operation: string; readonly how: string }) => {
  const copy = app(variant);
  const checked = run(copy.root, "check");
  expect(checked.status, `ortho check refuses the ${variant} variant:\n${checked.out}`).not.toBe(0);
  expect(checked.out).toMatch(/model ✘/);
  const file = `@fixture/payroll/blueprint/${path}`;
  const lines = checked.out.split("\n").filter((l) => l.includes(file));
  // The ledger's only operation that writes a line is its post; its read, get, isn't offered.
  expect(lines, `one line of ortho check names ${file}:\n${checked.out}`).toEqual([
    `  blueprint/features/payroll.ts: ${file}: the feature payroll writes gl-entry in ${s.operation} (${s.how}), and gl-entry is the feature ledger's: a feature writes only its own things. ` +
    `Run one of ledger's operations that write it inside this commit instead, as a step (Blueprint.step.operation): gl-entry.post`,
  ]);
  const generated = run(copy.root, "generate");
  expect(generated.status, `ortho generate refuses the ${variant} variant:\n${generated.out}`).not.toBe(0);
  expect(generated.out).toContain(file);
};

/** The project compiles: `ortho generate` succeeds, and `ortho check` refuses nothing in its model. */
const compiles = (variant: "own" | "inner") => {
  const copy = app(variant);
  const generated = run(copy.root, "generate");
  expect(generated.status, `ortho generate takes the ${variant} variant:\n${generated.out}`).toBe(0);
  const checked = run(copy.root, "check");
  expect(checked.out, `ortho check's model part takes the ${variant} variant:\n${checked.out}`).not.toMatch(/model ✘/);
  expect(checked.out).not.toContain(OWNERSHIP);
};

describe("16 ortho check refuses a feature writing another feature's thing", () => {
  it("refuses payroll writing the ledger's line by a step and by a verb on the line, and takes payroll's own writes and the app's", () => {
    refused("step", "things/salary-slip/verbs/submit.ts", { operation: "salary-slip.submit", how: "step lines" });
    refused("verb", "things/gl-entry/verbs/accrue.ts", { operation: "gl-entry.accrue", how: "move post and step save" });
    compiles("own");
  }, 240_000);

  it("takes payroll writing the ledger's line the allowed way, by running the ledger's post inside its commit (#1079)", () => {
    compiles("inner");
  }, 240_000);
});
