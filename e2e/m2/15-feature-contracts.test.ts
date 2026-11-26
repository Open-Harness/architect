// Check 15 (#1133, CX-feature-contracts): a contract one feature declares and another fills, run inside the caller's commit, at every door, on
// Cloudflare's database.
//
// Two feature packages are installed into a copy of acme, as a workspace installs them (a folder of TypeScript, linked into node_modules):
// `@fixture/payroll` owns the `slip` thing, its `slip.submit` operation and an optional contract, `slip-tax` (the tax on a slip), which
// `slip.submit` runs through a step after it has written the slip; `@fixture/payroll-tax-us` needs payroll and fills the contract: a US slip is
// taxed a tenth of its gross and gets a tax line, a GB slip is refused with the contract's TaxTableMissing, and a ZZ slip gets its tax line
// written before it is refused. Payroll declares a second optional contract, `slip-round` (what the gross is paid out as), which
// `payroll-tax-us` fills too, with another answer, so each step must get its own contract's filler. The app's own `bonus.pay` runs the tax
// contract as well: the app depends on every feature it mounts. The real command generates each app; a world runs it over local D1, and ada
// calls it through the API, MCP and the generated CLI. Once the world has stopped, its D1 file is read.
//
// The contract judged, the same as the compiler's mounts/contracts*.test.ts on the model:
//  - filled, the operation answers each step's filler's output, and only it, at every door, from payroll's operation and the app's, and the
//    slip and its tax line land together;
//  - the filler's refusal is the operation's, under the contract's error and its exit, and writes nothing: neither the caller's row nor the
//    filler's line;
//  - the fill is at no door: no MCP tool and no CLI command for it;
//  - with the filler installed and not mounted, the app builds, a slip has no tax and no tax line;
//  - with the contract required and no filler mounted, `ortho check` refuses the app, naming the contract.
// Written by the checks author for Goal 16; a builder never edits this file and only removes lines from `expected-failing/15-feature-contracts.txt`.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Blueprint } from "orthograph";
import { Worlds } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, nothingRunning } from "../layer1/support.ts";
import { acmeCli } from "../layer2/support.ts";
import { run } from "./secrets-support.ts";

// ---- the feature packages ----

const manifest = (name: string, needs: ReadonlyArray<string>) => JSON.stringify({
  name: `@fixture/${name}`, version: "1.0.0", private: true, type: "module",
  orthograph: { kind: "feature", blueprint: "blueprint", src: "src" },
  exports: { ".": "./index.ts", "./blueprint/*.js": "./blueprint/*.ts", "./blueprint/*": "./blueprint/*", "./src/*.js": "./src/*.ts", "./src/*": "./src/*" },
  dependencies: { orthograph: "workspace:*", ...Object.fromEntries(needs.map((n) => [`@fixture/${n}`, "1.0.0"])) },
}, null, 2);

/** The contract's file: optional, as payroll's is, or required for the check that `ortho check` refuses it unfilled. */
const contract = (optional: boolean) => `import { Blueprint } from "orthograph";
import { Amount, Country } from "../values/pay.ts";
import { TaxTableMissing } from "../things/slip/errors.ts";
/** The tax on a slip: whatever feature fills it works it out. */
export default Blueprint.contract({
  description: "The tax on a slip.",
  input: { slip: Blueprint.id("slp"), gross: Amount, country: Country },
  output: { tax: Amount },
  errors: [TaxTableMissing],${optional ? "\n  optional: true," : ""}
});
`;

const PAYROLL: Readonly<Record<string, string>> = {
  "package.json": manifest("payroll", []),
  "index.ts": `import { Blueprint } from "orthograph";\nexport default Blueprint.feature({ description: "Payroll." });\n`,
  "blueprint/values/pay.ts": `import { Blueprint } from "orthograph";
export const Amount = Blueprint.value(Blueprint.uint(32));
export const Country = Blueprint.value(Blueprint.text({ max: 2 }));
`,
  "blueprint/things/slip/thing.ts": `import { Blueprint } from "orthograph";
import { Amount, Country } from "../../values/pay.ts";
export const Slip = Blueprint.thing({ description: "A pay slip.", fields: { id: Blueprint.id("slp"), gross: Amount, country: Country } });
`,
  "blueprint/things/slip/errors.ts": `import { Blueprint } from "orthograph";
import { Country } from "../../values/pay.ts";
export class TaxTableMissing extends Blueprint.error({ country: Country }, { exit: 71 }) {}
`,
  "blueprint/contracts/slip-tax.ts": contract(true),
  // A second contract, filled by the same feature with another answer: each step must run its own contract's filler.
  "blueprint/contracts/slip-round.ts": `import { Blueprint } from "orthograph";
import { Amount } from "../values/pay.ts";
/** What a slip's gross is paid out as, rounded by whatever feature fills it. */
export default Blueprint.contract({ description: "A slip's gross, rounded to pay out.", input: { gross: Amount }, output: { rounded: Amount }, optional: true });
`,
  "blueprint/things/slip/verbs/submit.ts": `import { Blueprint } from "orthograph";
import { Amount, Country } from "../../../values/pay.ts";
import { Slip } from "../thing.ts";
import slipTax from "../../../contracts/slip-tax.ts";
import slipRound from "../../../contracts/slip-round.ts";
export default Blueprint.operation(Slip, {
  description: "Submit a slip, taxed and rounded by whatever features fill the two contracts.",
  payload: { slip: Blueprint.id("slp"), gross: Amount, country: Country },
  answer: { slip: Slip.fields.id, tax: Amount, rounded: Amount },
  allowed: [Blueprint.signedIn],
  steps: { save: Blueprint.step.database(), tax: Blueprint.step.contract(slipTax), round: Blueprint.step.contract(slipRound) },
});
`,
  // The slip is written first, then the contract runs: a refusal from the filler must take the slip back with it.
  "src/slip/submit.ts": `import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/slip/verbs/submit.ts";
import { Slip } from "../../blueprint/things/slip/thing.ts";
const submit: Handler<typeof declaration, Records> = (payload, { steps }) => Effect.gen(function* () {
  const records = yield* Records;
  yield* steps.save(records.insert(Slip, { id: payload.slip, gross: payload.gross, country: payload.country }));
  const taxed = yield* steps.tax({ slip: payload.slip, gross: payload.gross, country: payload.country });
  // A step answers its filler's output and nothing more: anything else is the runtime's bug.
  if (taxed !== undefined && Object.keys(taxed).join() !== "tax") return yield* Effect.die(new Error("the tax step answered " + Object.keys(taxed).join()));
  const round = yield* steps.round({ gross: payload.gross });
  if (round !== undefined && Object.keys(round).join() !== "rounded") return yield* Effect.die(new Error("the round step answered " + Object.keys(round).join()));
  return { slip: payload.slip, tax: taxed === undefined ? 0n : taxed.tax, rounded: round === undefined ? payload.gross : round.rounded };
});
export default submit;
`,
};

const TAX_US: Readonly<Record<string, string>> = {
  "package.json": manifest("payroll-tax-us", ["payroll"]),
  "index.ts": `import { Blueprint } from "orthograph";\nimport payroll from "@fixture/payroll";\nexport default Blueprint.feature({ description: "United States payroll tax.", needs: [payroll] });\n`,
  "blueprint/things/tax-line/thing.ts": `import { Blueprint } from "orthograph";
import { Amount } from "@fixture/payroll/blueprint/values/pay.js";
export const TaxLine = Blueprint.thing({ description: "A tax line on a slip.", fields: { id: Blueprint.id("txl"), slip: Blueprint.value(Blueprint.text({ max: 40 })), amount: Amount } });
`,
  // The filler writes the contract's shape out again, from the owner's values: the compiler holds the two side by side.
  "blueprint/fills/slip-tax.ts": `import { Blueprint } from "orthograph";
import slipTax from "@fixture/payroll/blueprint/contracts/slip-tax.js";
import { Amount, Country } from "@fixture/payroll/blueprint/values/pay.js";
import { TaxTableMissing } from "@fixture/payroll/blueprint/things/slip/errors.js";
import { TaxLine } from "../things/tax-line/thing.ts";
export default Blueprint.fill(slipTax, {
  description: "United States tax on a slip: a tenth of its gross.",
  input: { slip: Blueprint.id("slp"), gross: Amount, country: Country },
  output: { tax: Amount },
  errors: [TaxTableMissing],
  steps: { save: Blueprint.step.database({ writes: [TaxLine] }) },
});
`,
  // A US slip gets its line; a ZZ slip gets its line written and is then refused; anything else is refused before it writes.
  "src/fills/slip-tax.ts": `import { Effect } from "effect";
import { Records, type FillHandler } from "@orthograph/language-effect";
import { TaxTableMissing } from "@fixture/payroll/blueprint/things/slip/errors.js";
import type fill from "../../blueprint/fills/slip-tax.ts";
import { TaxLine } from "../../blueprint/things/tax-line/thing.ts";
// Typed from its fill declaration (CX-feature-contracts call 2): its input, its steps, its output and its errors.
const slipTax: FillHandler<typeof fill, Records> = (input, { steps }) => Effect.gen(function* () {
  if (input.country !== "US" && input.country !== "ZZ") return yield* new TaxTableMissing({ country: input.country });
  const records = yield* Records;
  const tax = input.gross / 10n;
  yield* steps.save(records.insert(TaxLine, { id: ("txl_" + input.slip.slice(4)) as never, slip: input.slip, amount: tax }));
  if (input.country === "ZZ") return yield* new TaxTableMissing({ country: input.country });
  return { tax };
});
export default slipTax;
`,
  "blueprint/fills/round.ts": `import { Blueprint } from "orthograph";
import slipRound from "@fixture/payroll/blueprint/contracts/slip-round.js";
import { Amount } from "@fixture/payroll/blueprint/values/pay.js";
export default Blueprint.fill(slipRound, { description: "Pay out in whole hundreds.", input: { gross: Amount }, output: { rounded: Amount } });
`,
  "src/fills/round.ts": `import { Effect } from "effect";
import type { FillHandler } from "@orthograph/language-effect";
import type fill from "../../blueprint/fills/round.ts";
const round: FillHandler<typeof fill> = (input) => Effect.succeed({ rounded: input.gross - (input.gross % 100n) });
export default round;
`,
};

const PACKAGES = { payroll: PAYROLL, "payroll-tax-us": TAX_US } as const;

/** The app's own bonus: an operation of the app, not of payroll, that runs payroll's tax contract (the app depends on every feature it mounts). */
const BONUS: Readonly<Record<string, string>> = {
  "blueprint/things/bonus/thing.ts": `import { Blueprint } from "orthograph";
import { Amount } from "@fixture/payroll/blueprint/values/pay.js";
export const Bonus = Blueprint.thing({ description: "A bonus the app pays.", fields: { id: Blueprint.id("bon"), gross: Amount } });
`,
  "blueprint/things/bonus/verbs/pay.ts": `import { Blueprint } from "orthograph";
import { Amount, Country } from "@fixture/payroll/blueprint/values/pay.js";
import slipTax from "@fixture/payroll/blueprint/contracts/slip-tax.js";
import { Bonus } from "../thing.ts";
export default Blueprint.operation(Bonus, {
  description: "Pay a bonus, taxed as a slip is.",
  payload: { slip: Blueprint.id("slp"), gross: Amount, country: Country },
  answer: { bonus: Bonus.fields.id, tax: Amount },
  allowed: [Blueprint.signedIn],
  steps: { save: Blueprint.step.database(), tax: Blueprint.step.contract(slipTax) },
});
`,
  "src/bonus/pay.ts": `import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/bonus/verbs/pay.ts";
import { Bonus } from "../../blueprint/things/bonus/thing.ts";
const pay: Handler<typeof declaration, Records> = (payload, { steps }) => Effect.gen(function* () {
  const records = yield* Records;
  const bonus = ("bon_" + payload.slip.slice(4)) as never;
  yield* steps.save(records.insert(Bonus, { id: bonus, gross: payload.gross }));
  const taxed = yield* steps.tax({ slip: payload.slip, gross: payload.gross, country: payload.country });
  if (taxed !== undefined && Object.keys(taxed).join() !== "tax") return yield* Effect.die(new Error("the tax step answered " + Object.keys(taxed).join()));
  return { bonus, tax: taxed === undefined ? 0n : taxed.tax };
});
export default pay;
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
const ortho = (root: string, ...args: ReadonlyArray<string>) => {
  const said = run(root, ...args);
  expect(said.status, `ortho ${args.join(" ")}:\n${said.out}`).toBe(0);
  return said;
};
/** A copy of acme with both packages installed and `mounted` mounted; `required` makes payroll's contract required. */
const app = (mounted: ReadonlyArray<keyof typeof PACKAGES>, required = false): App => {
  const copy = copyOf(acme);
  apps.push(copy);
  mkdirSync(join(copy.root, "node_modules/@fixture"), { recursive: true });
  for (const [name, files] of Object.entries(PACKAGES)) {
    write(join(copy.root, "plugins", name), files);
    symlinkSync(join(copy.root, "plugins", name), join(copy.root, "node_modules/@fixture", name));
  }
  if (required) write(join(copy.root, "plugins/payroll"), { "blueprint/contracts/slip-tax.ts": contract(false) });
  const pkg = JSON.parse(readFileSync(join(copy.root, "package.json"), "utf8")) as { dependencies: Record<string, string> };
  for (const name of Object.keys(PACKAGES)) pkg.dependencies[`@fixture/${name}`] = "1.0.0";
  writeFileSync(join(copy.root, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  write(copy.root, BONUS);
  write(copy.root, Object.fromEntries(mounted.map((n) => [`blueprint/features/${n}.ts`, `import { Blueprint } from "orthograph";\nimport plugin from "@fixture/${n}";\n\nexport default Blueprint.use(plugin, (_p) => []);\n`])));
  return copy;
};

type Answer = { readonly status: number; readonly body: Record<string, unknown> };
const sender = (url: string, token: string) => async (path: string, body: unknown): Promise<Answer> => {
  const response = await fetch(`${url}/${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}`, connection: "close" }, body: JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: (text.startsWith("{") ? JSON.parse(text) : { text }) as Record<string, unknown> };
};

/** Every row of `table` in the world's D1 file, or none when the table isn't there. */
const rowsOf = (root: string, name: string, table: string): ReadonlyArray<Record<string, unknown>> => {
  const walk = (dir: string): ReadonlyArray<string> => readdirSync(dir).flatMap((e) => statSync(join(dir, e)).isDirectory() ? walk(join(dir, e)) : e.endsWith(".sqlite") ? [join(dir, e)] : []);
  const files = walk(join(root, ".ortho", name)).filter((path) => {
    const db = new DatabaseSync(path, { readOnly: true });
    try { return db.prepare(`SELECT name FROM sqlite_master WHERE name = 'slip'`).all().length > 0; } finally { db.close(); }
  });
  expect(files, "one D1 file holds the slips").toHaveLength(1);
  const db = new DatabaseSync(files[0]!, { readOnly: true });
  try {
    return db.prepare(`SELECT name FROM sqlite_master WHERE name = ?`).all(table).length > 0 ? db.prepare(`SELECT * FROM "${table}" ORDER BY rowid`).all() as ReadonlyArray<Record<string, unknown>> : [];
  } finally { db.close(); }
};

/** Run a world over `root` and hand `body` ada's token and a sender, MCP and the CLI; the world is stopped when it is done. */
const inWorld = <A>(root: string, name: string, body: (w: { readonly url: string; readonly ada: string; readonly post: ReturnType<typeof sender>; readonly rpc: (method: string, params: object) => Promise<any> }) => Promise<A>) =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const world = yield* Worlds.start({ root, port: 0, name });
    return yield* Effect.promise(async () => {
      const url = world.url;
      const open = async (path: string, b: unknown) => (await (await fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify(b) })).json()) as Record<string, { token: string }>;
      const ada = (await open("/_world/cast", { names: ["ada"] }))["ada"]!.token;
      const agent = (await open("/_world/credential", { name: "ada", via: "agent" }) as unknown as { token: string }).token;
      const rpc = async (method: string, params: object) => {
        const response = await fetch(`${url}/mcp`, {
          method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${agent}`, connection: "close" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        });
        const text = await response.text();
        return JSON.parse(text.replace(/^data: /m, "").split("\n")[0]!) as { result?: any };
      };
      return body({ url, ada, post: sender(url, ada), rpc });
    });
  })));

/** The number a JSON answer holds, whether the wire sends it as a number or as text. */
const n = (x: unknown) => (typeof x === "string" || typeof x === "number" || typeof x === "bigint" ? Number(x) : Number.NaN);
/** A number an MCP tool's result answers under `key`: its structured content, or the JSON in its text. */
const numberIn = (result: any, key: string): number => {
  const structured = result?.structuredContent?.[key];
  if (structured !== undefined) return n(structured);
  for (const c of result?.content ?? []) {
    if (typeof c?.text !== "string") continue;
    try { const t = JSON.parse(c.text)?.[key]; if (t !== undefined) return n(t); } catch { /* not JSON */ }
  }
  return Number.NaN;
};
const slipIds = (rows: ReadonlyArray<Record<string, unknown>>) => rows.map((r) => r["id"]);

/** The surface #1133 adds, checked before any app is made, so a run on `main` names what is missing rather than a load error deep in generate. */
const built = () => {
  const bp = Blueprint as unknown as { readonly contract?: unknown; readonly fill?: unknown; readonly step: { readonly contract?: unknown } };
  if (typeof bp.contract !== "function") expect.fail("Blueprint.contract is not built: a feature can't declare a contract (#1133)");
  if (typeof bp.fill !== "function") expect.fail("Blueprint.fill is not built: a feature can't fill another's contract (#1133)");
  if (typeof bp.step.contract !== "function") expect.fail("Blueprint.step.contract is not built: an operation can't run a contract (#1133)");
};

describe("15 a contract one feature declares and another fills runs in the caller's commit, at every door, on D1", () => {
  it("filled, every door answers the filler's output and the slip and its tax line land together; the filler's refusal is the operation's and writes nothing", { timeout: 600_000 }, async () => {
    built();
    const { root } = app(["payroll", "payroll-tax-us"]);
    ortho(root, "generate");
    // It compiles: check passes the app, the contract, its fill and their handlers.
    ortho(root, "check");
    const model = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { contracts?: Record<string, { filler?: { mount?: string } | null }> };
    expect(model.contracts?.["payroll.slip-tax"]?.filler?.mount, "the model says who fills the tax contract").toBe("payroll-tax-us");

    const name = "m2-15-contracts";
    const got = await inWorld(root, name, async ({ url, ada, post, rpc }) => {
      const api = {
        us: await post("slip/submit", { slip: "slp_1", gross: "1050", country: "US" }),
        gb: await post("slip/submit", { slip: "slp_2", gross: "1050", country: "GB" }),
        zz: await post("slip/submit", { slip: "slp_3", gross: "1050", country: "ZZ" }),
        // The app's own operation runs the same contract, and gets the same filler.
        bonus: await post("bonus/pay", { slip: "slp_8", gross: "2000", country: "US" }),
        bonusGb: await post("bonus/pay", { slip: "slp_9", gross: "2000", country: "GB" }),
      };
      const tools = ((await rpc("tools/list", {})).result?.tools ?? []) as ReadonlyArray<{ name: string }>;
      const mcp = {
        tools: tools.map((t) => t.name),
        us: (await rpc("tools/call", { name: "slip.submit", arguments: { slip: "slp_4", gross: "550", country: "US" } })).result,
        gb: (await rpc("tools/call", { name: "slip.submit", arguments: { slip: "slp_5", gross: "550", country: "GB" } })).result,
      };
      const cli = {
        help: acmeCli(root, url, ada, "--help"),
        us: acmeCli(root, url, ada, "slip", "submit", "--slip", "slp_6", "--gross", "350", "--country", "US"),
        gb: acmeCli(root, url, ada, "slip", "submit", "--slip", "slp_7", "--gross", "350", "--country", "GB"),
      };
      return { api, mcp, cli };
    });
    nothingRunning(root);

    // The API: each step answers its own contract's filler, the tax a tenth and the pay out in whole hundreds; the app's own operation gets
    // the same tax filler; a refusal is the operation's, under the contract's error, before or after the filler wrote.
    expect(got.api.us.status, JSON.stringify(got.api.us.body)).toBe(200);
    expect({ slip: got.api.us.body["slip"], tax: n(got.api.us.body["tax"]), rounded: n(got.api.us.body["rounded"]) }).toEqual({ slip: "slp_1", tax: 105, rounded: 1000 });
    expect(got.api.bonus.status, JSON.stringify(got.api.bonus.body)).toBe(200);
    expect({ bonus: got.api.bonus.body["bonus"], tax: n(got.api.bonus.body["tax"]) }).toEqual({ bonus: "bon_8", tax: 200 });
    for (const key of ["gb", "zz", "bonusGb"] as const) {
      const a = got.api[key];
      expect(a.body["_tag"], `${key}: ${JSON.stringify(a.body)}`).toBe("TaxTableMissing");
      expect(a.status, `${key} is a refusal, not a defect`).toBeGreaterThanOrEqual(400);
      expect(a.status, `${key} is a refusal, not a defect`).toBeLessThan(500);
    }

    // MCP: slip.submit is a tool and answers the filler's tax; the fill is no tool.
    expect(got.mcp.tools, "MCP lists slip.submit").toContain("slip.submit");
    expect(got.mcp.tools.filter((t) => /tax|fill/i.test(t)), "no MCP tool is the fill").toEqual([]);
    expect(got.mcp.us?.isError, JSON.stringify(got.mcp.us)).not.toBe(true);
    expect([numberIn(got.mcp.us, "tax"), numberIn(got.mcp.us, "rounded")], `MCP answers the tax and the pay out: ${JSON.stringify(got.mcp.us)}`).toEqual([55, 500]);
    expect(got.mcp.gb?.isError, JSON.stringify(got.mcp.gb)).toBe(true);
    expect(JSON.stringify(got.mcp.gb)).toContain("TaxTableMissing");

    // The CLI: its call answers the tax and the pay out; its refused call exits with the contract's error's exit; its help offers no command
    // for a fill.
    expect(got.cli.us.status, got.cli.us.stderr).toBe(0);
    expect(got.cli.us.stdout).toMatch(/\b35\b/);
    expect(got.cli.us.stdout).toMatch(/\b300\b/);
    expect(got.cli.gb.status, "the CLI's refused call exits with TaxTableMissing's exit").toBe(71);
    expect(`${got.cli.gb.stdout}${got.cli.gb.stderr}`).toContain("TaxTableMissing");
    expect(got.cli.help.stdout, "the CLI has the slip commands").toMatch(/\bslip\b/);
    expect(got.cli.help.stdout, "the CLI has no command for the fill").not.toMatch(/slip-tax|slip-round|tax-line|\bround\b|\bfill/i);

    // D1: the accepted slips and their lines landed together; a refused slip left neither its slip nor the line its filler wrote.
    expect(slipIds(rowsOf(root, name, "slip"))).toEqual(["slp_1", "slp_4", "slp_6"]);
    expect(slipIds(rowsOf(root, name, "bonus")), "the refused bonus left no row").toEqual(["bon_8"]);
    const lines = rowsOf(root, name, "tax-line");
    expect(lines.map((r) => [r["slip"], n(r["amount"])])).toEqual([["slp_1", 105], ["slp_8", 200], ["slp_4", 55], ["slp_6", 35]]);
  });

  it("with the filler installed and not mounted, the app builds and a slip has no tax and no tax line; with the contract required, check refuses the app", { timeout: 600_000 }, async () => {
    built();
    const { root } = app(["payroll"]);
    ortho(root, "generate");
    const model = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { contracts?: Record<string, { filler?: unknown }> };
    expect(model.contracts?.["payroll.slip-tax"], "the model holds the contract").toBeDefined();
    expect(model.contracts?.["payroll.slip-tax"]?.filler, "no feature fills it").toBeNull();
    const name = "m2-15-unfilled";
    const got = await inWorld(root, name, async ({ post }) => ({
      us: await post("slip/submit", { slip: "slp_1", gross: "1050", country: "US" }),
      gb: await post("slip/submit", { slip: "slp_2", gross: "1050", country: "GB" }),
      bonus: await post("bonus/pay", { slip: "slp_8", gross: "2000", country: "US" }),
    }));
    nothingRunning(root);
    // It compiles: check passes the app whose optional contract nothing fills.
    ortho(root, "check");
    // No tax feature: every slip is taken, untaxed and unrounded, whatever its country; so is the app's bonus.
    for (const [key, slip] of [["us", "slp_1"], ["gb", "slp_2"]] as const) {
      expect(got[key].status, JSON.stringify(got[key].body)).toBe(200);
      expect({ slip: got[key].body["slip"], tax: n(got[key].body["tax"]), rounded: n(got[key].body["rounded"]) }).toEqual({ slip, tax: 0, rounded: 1050 });
    }
    expect(got.bonus.status, JSON.stringify(got.bonus.body)).toBe(200);
    expect(n(got.bonus.body["tax"])).toBe(0);
    expect(slipIds(rowsOf(root, name, "slip"))).toEqual(["slp_1", "slp_2"]);
    expect(rowsOf(root, name, "tax-line"), "nothing wrote a tax line").toEqual([]);
    expect(readdirSync(join(root, "generated"), { recursive: true }).map(String).filter((p) => /tax-line|payroll-tax-us/.test(p)), "nothing generated is the unmounted filler's").toEqual([]);

    // The same app with the contract required: generate refuses it and changes no model, then check refuses it too, each with the line that
    // names the contract and its file and says to mount a feature that fills it.
    const required = app(["payroll"], true);
    for (const command of ["generate", "check"] as const) {
      const said = run(required.root, command);
      expect(said.status, `ortho ${command}:\n${said.out}`).not.toBe(0);
      const line = said.out.split("\n").find((l) => l.includes("payroll.slip-tax"));
      expect(line, `ortho ${command} names the contract:\n${said.out}`).toBeDefined();
      expect(line, "the line names the contract's file").toContain("@fixture/payroll/blueprint/contracts/slip-tax.");
      expect(line, "the line says to mount a feature that fills it").toMatch(/\bmount\b/i);
    }
    // The copy keeps acme's own generated files; a refused generate wrote nothing of payroll's into them.
    expect(readFileSync(join(required.root, "generated/model/model.json"), "utf8"), "a refused generate changes no model").not.toContain("slip-tax");
  });
});
