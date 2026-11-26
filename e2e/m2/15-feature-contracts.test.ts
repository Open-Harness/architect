// Check 15 (#1133, CX-feature-contracts): a contract one feature declares and another fills, run inside the caller's commit, at every door, on
// Cloudflare's database.
//
// Two feature packages are installed into a copy of acme, as a workspace installs them (a folder of TypeScript, linked into node_modules):
// `@fixture/payroll` owns the `slip` thing, its `slip.submit` operation and an optional contract, `slip-tax` (the tax on a slip), which
// `slip.submit` runs through a step after it has written the slip; `@fixture/payroll-tax-us` needs payroll and fills the contract: a US slip is
// taxed a tenth of its gross and gets a tax line, a GB slip is refused with the contract's TaxTableMissing, and a ZZ slip gets its tax line
// written before it is refused. The real command generates each app; a world runs it over local D1, and ada calls it through the API, MCP and
// the generated CLI. Once the world has stopped, its D1 file is read.
//
// The contract judged, the same as the compiler's mounts/contracts*.test.ts on the model:
//  - filled, the operation answers the filler's output at every door, and the slip and its tax line land together;
//  - the filler's refusal is the operation's, under the contract's error, and writes nothing: neither the caller's slip nor the filler's line;
//  - the fill is at no door: no MCP tool and no CLI command for it;
//  - with the filler installed and not mounted, the app builds, a slip has no tax and no tax line;
//  - with the contract required and no filler mounted, `ortho check` refuses the app, naming the contract.
// Written by the checks author for Goal 16; a builder never edits this file and only removes lines from `expected-failing/15-feature-contracts.txt`.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
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
  "blueprint/things/slip/verbs/submit.ts": `import { Blueprint } from "orthograph";
import { Amount, Country } from "../../../values/pay.ts";
import { Slip } from "../thing.ts";
import slipTax from "../../../contracts/slip-tax.ts";
export default Blueprint.operation(Slip, {
  description: "Submit a slip, taxed by whatever feature fills the tax contract.",
  payload: { slip: Blueprint.id("slp"), gross: Amount, country: Country },
  answer: { slip: Slip.fields.id, tax: Amount },
  allowed: [Blueprint.signedIn],
  steps: { save: Blueprint.step.database(), tax: Blueprint.step.contract(slipTax) },
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
  return { slip: payload.slip, tax: taxed === undefined ? 0n : taxed.tax };
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
import { Records } from "@orthograph/language-effect";
import { TaxTableMissing } from "@fixture/payroll/blueprint/things/slip/errors.js";
import { TaxLine } from "../../blueprint/things/tax-line/thing.ts";
type Input = { readonly slip: string; readonly gross: bigint; readonly country: string };
type Steps = { readonly save: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> };
const slipTax = (input: Input, { steps }: { readonly steps: Steps }) => Effect.gen(function* () {
  if (input.country !== "US" && input.country !== "ZZ") return yield* new TaxTableMissing({ country: input.country });
  const records = yield* Records;
  const tax = input.gross / 10n;
  yield* steps.save(records.insert(TaxLine, { id: ("txl_" + input.slip.slice(4)) as never, slip: input.slip, amount: tax }));
  if (input.country === "ZZ") return yield* new TaxTableMissing({ country: input.country });
  return { tax };
});
export default slipTax;
`,
};

const PACKAGES = { payroll: PAYROLL, "payroll-tax-us": TAX_US } as const;

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
/** The tax an MCP tool's result answers: its structured content, or the JSON in its text. */
const taxIn = (result: any): number => {
  const structured = result?.structuredContent?.tax;
  if (structured !== undefined) return n(structured);
  for (const c of result?.content ?? []) {
    if (typeof c?.text !== "string") continue;
    try { const t = JSON.parse(c.text)?.tax; if (t !== undefined) return n(t); } catch { /* not JSON */ }
  }
  return Number.NaN;
};
const slipIds = (rows: ReadonlyArray<Record<string, unknown>>) => rows.map((r) => r["id"]);

describe("15 a contract one feature declares and another fills runs in the caller's commit, at every door, on D1", () => {
  it("filled, every door answers the filler's output and the slip and its tax line land together; the filler's refusal is the operation's and writes nothing", { timeout: 600_000 }, async () => {
    const { root } = app(["payroll", "payroll-tax-us"]);
    ortho(root, "generate");
    // It compiles: check passes the app, the contract, its fill and their handlers.
    ortho(root, "check");
    const model = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { contracts?: Record<string, { filler?: { mount?: string } | null }> };
    expect(model.contracts?.["payroll.slip-tax"]?.filler?.mount, "the model says who fills the tax contract").toBe("payroll-tax-us");

    const name = "m2-15-contracts";
    const got = await inWorld(root, name, async ({ url, ada, post, rpc }) => {
      const api = {
        us: await post("slip/submit", { slip: "slp_1", gross: "1000", country: "US" }),
        gb: await post("slip/submit", { slip: "slp_2", gross: "1000", country: "GB" }),
        zz: await post("slip/submit", { slip: "slp_3", gross: "1000", country: "ZZ" }),
      };
      const tools = ((await rpc("tools/list", {})).result?.tools ?? []) as ReadonlyArray<{ name: string }>;
      const mcp = {
        tools: tools.map((t) => t.name),
        us: (await rpc("tools/call", { name: "slip.submit", arguments: { slip: "slp_4", gross: "500", country: "US" } })).result,
        gb: (await rpc("tools/call", { name: "slip.submit", arguments: { slip: "slp_5", gross: "500", country: "GB" } })).result,
      };
      const cli = {
        help: acmeCli(root, url, ada, "--help"),
        us: acmeCli(root, url, ada, "slip", "submit", "--slip", "slp_6", "--gross", "300", "--country", "US"),
        gb: acmeCli(root, url, ada, "slip", "submit", "--slip", "slp_7", "--gross", "300", "--country", "GB"),
      };
      return { api, mcp, cli };
    });
    nothingRunning(root);

    // The API: the filler's tax is the answer; its refusal is the operation's, under the contract's error, before or after it wrote.
    expect(got.api.us.status, JSON.stringify(got.api.us.body)).toBe(200);
    expect({ slip: got.api.us.body["slip"], tax: n(got.api.us.body["tax"]) }).toEqual({ slip: "slp_1", tax: 100 });
    for (const key of ["gb", "zz"] as const) {
      const a = got.api[key];
      expect(a.body["_tag"], `${key}: ${JSON.stringify(a.body)}`).toBe("TaxTableMissing");
      expect(a.status, `${key} is a refusal, not a defect`).toBeGreaterThanOrEqual(400);
      expect(a.status, `${key} is a refusal, not a defect`).toBeLessThan(500);
    }

    // MCP: slip.submit is a tool and answers the filler's tax; the fill is no tool.
    expect(got.mcp.tools, "MCP lists slip.submit").toContain("slip.submit");
    expect(got.mcp.tools.filter((t) => /tax|fill/i.test(t)), "no MCP tool is the fill").toEqual([]);
    expect(got.mcp.us?.isError, JSON.stringify(got.mcp.us)).not.toBe(true);
    expect(taxIn(got.mcp.us), `MCP answers the tax: ${JSON.stringify(got.mcp.us)}`).toBe(50);
    expect(got.mcp.gb?.isError, JSON.stringify(got.mcp.gb)).toBe(true);
    expect(JSON.stringify(got.mcp.gb)).toContain("TaxTableMissing");

    // The CLI: its call answers the tax and its refused call fails; its help offers no command for the fill.
    expect(got.cli.us.status, got.cli.us.stderr).toBe(0);
    expect(got.cli.us.stdout).toMatch(/\b30\b/);
    expect(got.cli.gb.status, "the CLI's refused call fails").not.toBe(0);
    expect(`${got.cli.gb.stdout}${got.cli.gb.stderr}`).toContain("TaxTableMissing");
    expect(got.cli.help.stdout, "the CLI has the slip commands").toMatch(/\bslip\b/);
    expect(got.cli.help.stdout, "the CLI has no command for the fill").not.toMatch(/slip-tax|tax-line|\bfill/i);

    // D1: the accepted slips and their lines landed together; a refused slip left neither its slip nor the line its filler wrote.
    expect(slipIds(rowsOf(root, name, "slip"))).toEqual(["slp_1", "slp_4", "slp_6"]);
    const lines = rowsOf(root, name, "tax-line");
    expect(lines.map((r) => [r["slip"], n(r["amount"])])).toEqual([["slp_1", 100], ["slp_4", 50], ["slp_6", 30]]);
  });

  it("with the filler installed and not mounted, the app builds and a slip has no tax and no tax line; with the contract required, check refuses the app", { timeout: 600_000 }, async () => {
    const { root } = app(["payroll"]);
    ortho(root, "generate");
    const model = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { contracts?: Record<string, { filler?: unknown }> };
    expect(model.contracts?.["payroll.slip-tax"], "the model holds the contract").toBeDefined();
    expect(model.contracts?.["payroll.slip-tax"]?.filler, "no feature fills it").toBeNull();
    const name = "m2-15-unfilled";
    const got = await inWorld(root, name, async ({ post }) => ({ us: await post("slip/submit", { slip: "slp_1", gross: "1000", country: "US" }), gb: await post("slip/submit", { slip: "slp_2", gross: "1000", country: "GB" }) }));
    nothingRunning(root);
    // It compiles: check passes the app whose optional contract nothing fills.
    ortho(root, "check");
    // No tax feature: every slip is taken, untaxed, whatever its country.
    for (const [key, slip] of [["us", "slp_1"], ["gb", "slp_2"]] as const) {
      expect(got[key].status, JSON.stringify(got[key].body)).toBe(200);
      expect({ slip: got[key].body["slip"], tax: n(got[key].body["tax"]) }).toEqual({ slip, tax: 0 });
    }
    expect(slipIds(rowsOf(root, name, "slip"))).toEqual(["slp_1", "slp_2"]);
    expect(rowsOf(root, name, "tax-line"), "nothing wrote a tax line").toEqual([]);
    expect(readdirSync(join(root, "generated"), { recursive: true }).map(String).filter((p) => /tax-line|payroll-tax-us/.test(p)), "nothing generated is the unmounted filler's").toEqual([]);

    // The same app with the contract required: check refuses it, naming the contract.
    const required = app(["payroll"], true);
    const said = run(required.root, "check");
    expect(said.status, said.out).not.toBe(0);
    expect(said.out).toContain("payroll.slip-tax");
  });
});
