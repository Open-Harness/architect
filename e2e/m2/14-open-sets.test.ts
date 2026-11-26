// Check 14 (#1132, CX-open-sets): an open set's members are the mounted features', at every door, on Cloudflare's database.
//
// Five feature packages are installed into a copy of acme, as a workspace installs them (a folder of TypeScript, linked into node_modules):
// `@fixture/ledger` owns two open sets, VoucherType (its own members: Journal Entry, Contra Entry) and PartyType (none of its own), and a
// reference to each; `@fixture/payments` adds Payment Entry, `@fixture/parties` adds Customer and Supplier, and `@fixture/invoicing` adds
// Sales Invoice. `@fixture/crm` needs nothing and owns an open set of its own, also exported as `PartyType` from `blueprint/values/ledger.ts`
// (its own member: Lead): a set is its owner's and its export's, so the two never share a member. The app owns two open sets itself,
// `Channel` (Web, Phone) and `Tag` (no member). The app mounts the ledger, payments, parties and the crm; invoicing is installed and never
// mounted. The app's own `posting` thing holds a voucher type, a reference to a voucher and to a party, the crm's party type and a channel;
// `posting.record` takes those, an optional tag and a list of voucher types. The real command generates the app; a world runs it over
// local D1, and ada calls it through the API, MCP and the generated CLI. The generated SDK is called on its own, with nothing listening.
// Once the world has stopped, its D1 file is read.
//
// The contract judged, the same as the compiler's mounts/open-sets*.test.ts on the model:
//  - nothing generated names the unmounted feature's member;
//  - the API takes a member of the set, from the owner or a mounted feature, as a value, as a reference's kind and in a list, and refuses
//    with 400 InvalidPayload: a member of an unmounted feature (plain, as a kind, in a list), a name in no set, a member of another set
//    (the ledger's other set, or the crm's set of the same name, either way round), a reference of refAny()'s shape, a reference whose id
//    is empty or a number, a member in another case or padded, and any value of a set with no member;
//  - MCP lists, as each field's own enum (a reference's at its kind, a list's at its items), exactly the union in the model's order, with
//    nothing beside it that lets other text through; it refuses a call with the unmounted member and one with the crm's member given the
//    ledger's party type;
//  - the CLI's help names, for each flag, its own set's members in order and no other set's, and the CLI's call is refused with the
//    unmounted member and takes a mounted feature's;
//  - the SDK refuses the unmounted member and the other same-name set's member with InvalidPayload before it sends anything, and sends a
//    mounted feature's;
//  - only the accepted calls wrote a row.
// Written by the checks author for Goal 16; a builder never edits this file and only removes lines from `expected-failing/14-open-sets.txt`.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Effect } from "effect";
import { Worlds } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, nothingRunning } from "../layer1/support.ts";
import { acmeCli } from "../layer2/support.ts";
import { run } from "./secrets-support.ts";

// ---- the feature packages ----

const manifest = (name: string, needs: ReadonlyArray<string>) => JSON.stringify({
  name: `@fixture/${name}`, version: "1.0.0", private: true, type: "module",
  orthograph: { kind: "feature", blueprint: "blueprint" },
  exports: { ".": "./index.ts", "./blueprint/*.js": "./blueprint/*.ts", "./blueprint/*": "./blueprint/*" },
  dependencies: { orthograph: "workspace:*", ...Object.fromEntries(needs.map((n) => [`@fixture/${n}`, "1.0.0"])) },
}, null, 2);
const descriptor = (description: string, needs: ReadonlyArray<string>) => `import { Blueprint } from "orthograph";
${needs.map((n) => `import ${n} from "@fixture/${n}";\n`).join("")}export default Blueprint.feature({ description: ${JSON.stringify(description)}${needs.length > 0 ? `, needs: [${needs.join(", ")}]` : ""} });
`;
const adds = (set: string, members: ReadonlyArray<string>) => `import { Blueprint } from "orthograph";
import { ${set} } from "@fixture/ledger/blueprint/values/ledger.js";
export const added = Blueprint.oneOf.add(${set}, ${JSON.stringify(members)});
`;

const PACKAGES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  ledger: {
    "package.json": manifest("ledger", []),
    "index.ts": descriptor("The books.", []),
    "blueprint/values/ledger.ts": `import { Blueprint } from "orthograph";
/** The kind of record a ledger line was posted by: the ledger's own, and what each feature that posts adds. */
export const VoucherType = Blueprint.value(Blueprint.oneOf.open(["Journal Entry", "Contra Entry"]));
/** The kind of party a line is against: none of the ledger's own. */
export const PartyType = Blueprint.value(Blueprint.oneOf.open([]));
export const Voucher = Blueprint.value(Blueprint.refAny.of(VoucherType));
export const Party = Blueprint.value(Blueprint.refAny.of(PartyType));
`,
  },
  payments: { "package.json": manifest("payments", ["ledger"]), "index.ts": descriptor("Payments.", ["ledger"]), "blueprint/values/vouchers.ts": adds("VoucherType", ["Payment Entry"]) },
  parties: { "package.json": manifest("parties", ["ledger"]), "index.ts": descriptor("Customers and suppliers.", ["ledger"]), "blueprint/values/parties.ts": adds("PartyType", ["Supplier", "Customer"]) },
  invoicing: { "package.json": manifest("invoicing", ["ledger"]), "index.ts": descriptor("Invoices.", ["ledger"]), "blueprint/values/vouchers.ts": adds("VoucherType", ["Sales Invoice"]) },
  // Needs nothing; its set has the ledger's export name and file path, and is another set.
  crm: {
    "package.json": manifest("crm", []),
    "index.ts": descriptor("Contacts.", []),
    "blueprint/values/ledger.ts": `import { Blueprint } from "orthograph";
/** The kind of contact the crm keeps: the crm's own set, not the ledger's, though it has the same name. */
export const PartyType = Blueprint.value(Blueprint.oneOf.open(["Lead"]));
`,
  },
};
const MOUNTED = ["ledger", "payments", "parties", "crm"] as const;

// ---- the app's own posting ----

const FILES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(MOUNTED.map((n) => [`blueprint/features/${n}.ts`, `import { Blueprint } from "orthograph";\nimport plugin from "@fixture/${n}";\n\nexport default Blueprint.use(plugin, (_p) => []);\n`])),
  // The app's own open set: its owner is the app, and no feature depends on the app.
  "blueprint/values/channels.ts": `import { Blueprint } from "orthograph";
/** How a posting came in. */
export const Channel = Blueprint.value(Blueprint.oneOf.open(["Web", "Phone"]));
/** A tag: an open set the app owns with no member yet, so it takes nothing. */
export const Tag = Blueprint.value(Blueprint.oneOf.open([]));
`,
  "blueprint/things/posting/thing.ts": `import { Blueprint } from "orthograph";
import { Party, Voucher, VoucherType } from "@fixture/ledger/blueprint/values/ledger.js";
import { PartyType as ContactType } from "@fixture/crm/blueprint/values/ledger.js";
import { Channel } from "../../values/channels.ts";
export const Posting = Blueprint.thing({ description: "A posting the app keeps.", fields: { id: Blueprint.id("pst"), voucherType: VoucherType, voucher: Voucher, party: Party, contactType: ContactType, channel: Channel } });
`,
  "blueprint/things/posting/verbs/record.ts": `import { Blueprint } from "orthograph";
import { Posting } from "../thing.ts";
import { Tag } from "../../../values/channels.ts";
import { VoucherType } from "@fixture/ledger/blueprint/values/ledger.js";
export default Blueprint.operation(Posting, {
  description: "Record a posting.",
  payload: { posting: Blueprint.id("pst"), tag: Blueprint.optional(Tag), kinds: Blueprint.list(VoucherType), voucherType: Posting.fields.voucherType, voucher: Posting.fields.voucher, party: Posting.fields.party, contactType: Posting.fields.contactType, channel: Posting.fields.channel },
  answer: { posting: Posting.fields.id },
  allowed: [Blueprint.signedIn],
  steps: { save: Blueprint.step.database() },
});
`,
};
const HANDLERS: Readonly<Record<string, string>> = {
  "src/posting/record.ts": `import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Posting } from "../../blueprint/things/posting/thing.ts";
export default ((payload: any, context: any) => Effect.gen(function* () {
  const records = yield* Records;
  yield* context.steps.save(records.insert(Posting, { id: payload.posting, voucherType: payload.voucherType, voucher: payload.voucher, party: payload.party, contactType: payload.contactType, channel: payload.channel } as never));
  return { posting: payload.posting };
})) as never;
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
/** A copy of acme with the five packages installed, four of them mounted, generated, its handler written, and generated again. */
const app = (): App => {
  const copy = copyOf(acme);
  apps.push(copy);
  mkdirSync(join(copy.root, "node_modules/@fixture"), { recursive: true });
  for (const [name, files] of Object.entries(PACKAGES)) {
    write(join(copy.root, "plugins", name), files);
    symlinkSync(join(copy.root, "plugins", name), join(copy.root, "node_modules/@fixture", name));
  }
  const pkg = JSON.parse(readFileSync(join(copy.root, "package.json"), "utf8")) as { dependencies: Record<string, string> };
  for (const name of Object.keys(PACKAGES)) pkg.dependencies[`@fixture/${name}`] = "1.0.0";
  writeFileSync(join(copy.root, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  write(copy.root, FILES);
  ortho(copy.root, "generate");
  write(copy.root, HANDLERS);
  ortho(copy.root, "generate");
  return copy;
};

/** Every file under `generated/`, with its text. */
const generated = (root: string): ReadonlyArray<readonly [string, string]> => {
  const walk = (dir: string): ReadonlyArray<string> => readdirSync(dir).flatMap((e) => statSync(join(dir, e)).isDirectory() ? walk(join(dir, e)) : [join(dir, e)]);
  return walk(join(root, "generated")).map((f) => [f.slice(root.length + 1), readFileSync(f, "utf8")] as const);
};

/** A schema with its `$ref` followed, once. */
const resolved = (s: unknown, root: unknown): Record<string, unknown> | undefined => {
  const o = s as Record<string, unknown> | undefined;
  return typeof o?.["$ref"] === "string" && o["$ref"].startsWith("#/") ? o["$ref"].slice(2).split("/").reduce<unknown>((at, key) => (at as Record<string, unknown> | undefined)?.[key], root) as Record<string, unknown> : o;
};
/**
 * The members a property takes, read where they constrain it: its own `enum`, in order, with no `anyOf`, `oneOf`, `allOf` or `not`
 * beside it that could let other text through; for a reference, its `kind`'s. Anything else is reported as what it is.
 */
const membersAt = (property: unknown, root: unknown, shape: boolean | "list"): unknown => {
  const outer = resolved(property, root);
  const at = resolved(shape === "list" ? outer?.["items"] : shape ? (outer?.["properties"] as Record<string, unknown> | undefined)?.["kind"] : property, root);
  const loose = ["anyOf", "oneOf", "allOf", "not", "const"].filter((k) => at !== undefined && k in at);
  return loose.length > 0 ? `loosened by ${loose.join(", ")}: ${JSON.stringify(at)}` : at?.["enum"];
};
/** Every string a JSON schema allows by `enum` or `const`, through its `$ref`s. */
const kindsIn = (schema: unknown, root: unknown): ReadonlyArray<string> => {
  const seen = new Set<unknown>();
  const found: Array<string> = [];
  const walk = (s: unknown): void => {
    if (typeof s !== "object" || s === null || seen.has(s)) return;
    seen.add(s);
    const o = s as Record<string, unknown>;
    if (Array.isArray(o["enum"])) for (const e of o["enum"]) if (typeof e === "string") found.push(e);
    if (typeof o["const"] === "string") found.push(o["const"]);
    if (typeof o["$ref"] === "string" && o["$ref"].startsWith("#/")) walk(o["$ref"].slice(2).split("/").reduce<unknown>((at, key) => (at as Record<string, unknown> | undefined)?.[key], root));
    for (const [k, v] of Object.entries(o)) if (k !== "$ref") walk(v);
  };
  walk(schema);
  return [...new Set(found)].sort();
};

type Answer = { readonly status: number; readonly body: Record<string, unknown> };
const sender = (url: string, token: string) => async (path: string, body: unknown): Promise<Answer> => {
  const response = await fetch(`${url}/${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}`, connection: "close" }, body: JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: (text.startsWith("{") ? JSON.parse(text) : { text }) as Record<string, unknown> };
};

/** The world's one D1 file: the sqlite file under its state that holds the postings. */
const postingsOf = (root: string, name: string): ReadonlyArray<Record<string, unknown>> => {
  const walk = (dir: string): ReadonlyArray<string> => readdirSync(dir).flatMap((e) => statSync(join(dir, e)).isDirectory() ? walk(join(dir, e)) : e.endsWith(".sqlite") ? [join(dir, e)] : []);
  const rows = walk(join(root, ".ortho", name)).flatMap((path) => {
    const db = new DatabaseSync(path, { readOnly: true });
    try {
      return db.prepare(`SELECT name FROM sqlite_master WHERE name = 'posting'`).all().length > 0 ? [db.prepare(`SELECT * FROM "posting" ORDER BY rowid`).all() as ReadonlyArray<Record<string, unknown>>] : [];
    } finally { db.close(); }
  });
  expect(rows, "one D1 file holds the postings").toHaveLength(1);
  return rows[0]!;
};

/** Each flag's help in the generated CLI's `--help`, by the flag's name: its line and the lines under it, up to the next flag. */
const flagsOf = (help: string): ReadonlyMap<string, string> => {
  const flags = new Map<string, string>();
  let at: string | undefined;
  for (const line of help.split("\n")) {
    const flag = /^\s+--([A-Za-z][\w-]*)\b/.exec(line)?.[1];
    if (flag !== undefined) { at = flag; flags.set(flag, line); }
    else if (at !== undefined && /^\s{4,}\S/.test(line)) flags.set(at, `${flags.get(at)!} ${line.trim()}`);
    else at = undefined;
  }
  return flags;
};

// In the model's order: the owner's own, in its order, then what the mounted features add, by name.
const VOUCHERS = ["Journal Entry", "Contra Entry", "Payment Entry"];
const PARTIES = ["Customer", "Supplier"];
const CONTACTS = ["Lead"];
const CHANNELS = ["Web", "Phone"];
const voucher = (kind: string, id = "v_1") => ({ kind, id });

describe("14 an open set holds the mounted features' members, at every door, on D1", () => {
  it("takes a mounted member, refuses an unmounted feature's member and any name outside the set, through the API, MCP and the CLI", { timeout: 600_000 }, async () => {
    const { root } = app();

    // Nothing generated names the member only an unmounted feature adds; the model names the mounted ones.
    const files = generated(root);
    expect(files.filter(([, text]) => text.includes("Sales Invoice")).map(([path]) => path), "no generated file names Sales Invoice").toEqual([]);
    const model = files.find(([path]) => path === "generated/model/model.json")?.[1] ?? "";
    for (const kind of [...VOUCHERS, ...PARTIES, ...CONTACTS, ...CHANNELS]) expect(model, `the model names ${kind}`).toContain(JSON.stringify(kind));

    const name = "m2-14-open-sets";
    const got = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const world = yield* Worlds.start({ root, port: 0, name });
      return yield* Effect.promise(async () => {
        const url = world.url;
        const open = async (path: string, body: unknown) => (await (await fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify(body) })).json()) as Record<string, { token: string }>;
        const ada = (await open("/_world/cast", { names: ["ada"] }))["ada"]!.token;
        const agent = (await open("/_world/credential", { name: "ada", via: "agent" }) as unknown as { token: string }).token;
        const post = sender(url, ada);
        let n = 0;
        const next = () => `pst_${String(++n)}`;
        const record = (kind: string, v: unknown, party: unknown, more: { contactType?: string; channel?: string; tag?: string; kinds?: ReadonlyArray<string> } = {}) =>
          post("posting/record", { posting: next(), voucherType: kind, voucher: v, party, contactType: "Lead", channel: "Web", kinds: ["Journal Entry"], ...more });
        const api = {
          payment: await record("Payment Entry", voucher("Payment Entry"), { kind: "Customer", id: "c_1" }, { kinds: ["Payment Entry", "Contra Entry"] }),
          journal: await record("Journal Entry", voucher("Journal Entry", "j_1"), { kind: "Supplier", id: "s_1" }, { channel: "Phone" }),
          unmountedKind: await record("Sales Invoice", voucher("Payment Entry"), { kind: "Customer", id: "c_1" }),
          unmountedRef: await record("Payment Entry", voucher("Sales Invoice"), { kind: "Customer", id: "c_1" }),
          noSuchKind: await record("Nonsense", voucher("Payment Entry"), { kind: "Customer", id: "c_1" }),
          noSuchParty: await record("Payment Entry", voucher("Payment Entry"), { kind: "Shareholder", id: "x_1" }),
          otherSetKind: await record("Customer", voucher("Payment Entry"), { kind: "Customer", id: "c_1" }),
          otherSetRef: await record("Payment Entry", voucher("Payment Entry"), { kind: "Journal Entry", id: "j_1" }),
          declarationShape: await record("Payment Entry", { declaration: "payment-entry", id: "v_1" }, { kind: "Customer", id: "c_1" }),
          emptyId: await record("Payment Entry", voucher("Payment Entry", ""), { kind: "Customer", id: "c_1" }),
          // The crm's PartyType and the ledger's are two sets: neither takes the other's member.
          ledgerPartyAsContact: await record("Payment Entry", voucher("Payment Entry"), { kind: "Customer", id: "c_1" }, { contactType: "Customer" }),
          contactAsParty: await record("Payment Entry", voucher("Payment Entry"), { kind: "Lead", id: "c_1" }),
          idNotText: await record("Payment Entry", { kind: "Payment Entry", id: 5 }, { kind: "Customer", id: "c_1" }),
          // A member is its exact name: not another case, not padded.
          caseKind: await record("payment entry", voucher("Payment Entry"), { kind: "Customer", id: "c_1" }),
          caseRef: await record("Payment Entry", voucher("payment entry"), { kind: "Customer", id: "c_1" }),
          paddedKind: await record(" Payment Entry", voucher("Payment Entry"), { kind: "Customer", id: "c_1" }),
          // A set with no member takes nothing.
          emptySet: await record("Payment Entry", voucher("Payment Entry"), { kind: "Customer", id: "c_1" }, { tag: "Anything" }),
          listUnmounted: await record("Payment Entry", voucher("Payment Entry"), { kind: "Customer", id: "c_1" }, { kinds: ["Payment Entry", "Sales Invoice"] }),
          noSuchChannel: await record("Payment Entry", voucher("Payment Entry"), { kind: "Customer", id: "c_1" }, { channel: "Fax" }),
        };
        const rpc = async (method: string, params: object) => {
          const response = await fetch(`${url}/mcp`, {
            method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${agent}`, connection: "close" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          });
          const text = await response.text();
          return JSON.parse(text.replace(/^data: /m, "").split("\n")[0]!) as { result?: { tools?: ReadonlyArray<{ name: string; inputSchema: unknown }>; isError?: boolean } };
        };
        const tool = (await rpc("tools/list", {})).result?.tools?.find((t) => t.name === "posting.record");
        const mcpCall = async (kind: string, contactType = "Lead") =>
          (await rpc("tools/call", { name: "posting.record", arguments: { posting: next(), voucherType: kind, voucher: voucher(kind), party: { kind: "Customer", id: "c_1" }, contactType, channel: "Web", kinds: [kind] } })).result;
        // The crm's set is another set of the same name: the ledger's member is not one of it.
        const mcp = { tool, accepted: await mcpCall("Payment Entry"), refused: await mcpCall("Sales Invoice"), otherSameName: await mcpCall("Payment Entry", "Customer") };
        const cli = (kind: string) => acmeCli(root, url, ada, "posting", "record", "--posting", next(), "--voucherType", kind, "--voucher", JSON.stringify(voucher(kind)), "--party", JSON.stringify({ kind: "Customer", id: "c_1" }), "--contactType", "Lead", "--channel", "Web", "--kinds", JSON.stringify([kind]));
        const help = acmeCli(root, url, ada, "posting", "record", "--help");
        // The accepted call is a mounted feature's member: a CLI that knows only the owner's own members would refuse it.
        return { api, mcp, cli: { help, accepted: cli("Payment Entry"), refused: cli("Sales Invoice") } };
      });
    })));
    nothingRunning(root);

    // The SDK, on its own, pointed at a port nothing listens on: a payload it refuses never leaves it (InvalidPayload); one it takes is sent,
    // and fails only for want of a server.
    writeFileSync(join(root, "sdk-probe.ts"), `import { Effect, Exit, Cause } from "effect";
import * as Sdk from "./generated/sdk/src/index.ts";
const base = { posting: "pst_99", voucher: { kind: "Payment Entry", id: "v_1" }, party: { kind: "Customer", id: "c_1" }, contactType: "Lead", channel: "Web", kinds: ["Journal Entry"] };
const tag = (over: object) => Effect.runPromiseExit(Sdk.posting.record({ ...base, voucherType: "Payment Entry", ...over } as never).pipe(Effect.provide(Sdk.layer("http://127.0.0.1:9", "t"))))
  .then((exit) => Exit.isSuccess(exit) ? "sent and answered" : String((Cause.squash(exit.cause) as { _tag?: unknown })?._tag ?? Cause.pretty(exit.cause)));
Promise.all([tag({}), tag({ voucherType: "Sales Invoice" }), tag({ contactType: "Customer" })]).then(([accepted, unmounted, otherSameName]) => console.log(JSON.stringify({ accepted, unmounted, otherSameName })));
`);
    const probe = spawnSync(process.execPath, [join(root, "sdk-probe.ts")], { cwd: root, encoding: "utf8", timeout: 120_000 });
    const sdk = JSON.parse(probe.stdout.trim().split("\n").pop() || "{}") as Record<string, string>;
    expect(sdk["unmounted"], `the SDK refuses Sales Invoice before sending: ${probe.stdout}${probe.stderr}`).toBe("InvalidPayload");
    expect(sdk["otherSameName"], "the SDK refuses the ledger's Customer as the crm's party type").toBe("InvalidPayload");
    expect(sdk["accepted"], "the SDK sends Payment Entry (and finds no server)").not.toBe("InvalidPayload");
    expect(sdk["accepted"]).not.toBe(undefined);

    // The API: a member of the set, the owner's or a mounted feature's, is taken; anything else is refused before the handler runs.
    expect(got.api.payment.status, JSON.stringify(got.api.payment.body)).toBe(200);
    expect(got.api.journal.status, JSON.stringify(got.api.journal.body)).toBe(200);
    for (const key of ["unmountedKind", "unmountedRef", "noSuchKind", "noSuchParty", "otherSetKind", "otherSetRef", "declarationShape", "emptyId", "ledgerPartyAsContact", "contactAsParty", "idNotText", "caseKind", "caseRef", "paddedKind", "emptySet", "listUnmounted", "noSuchChannel"] as const) {
      expect(got.api[key], `${key}: ${JSON.stringify(got.api[key].body)}`).toMatchObject({ status: 400, body: { _tag: "InvalidPayload" } });
    }

    // MCP: the tool's input lists exactly the mounted members for each field, and refuses the unmounted one.
    expect(got.mcp.tool, "MCP lists posting.record").toBeDefined();
    const input = got.mcp.tool!.inputSchema as { properties?: Record<string, unknown> };
    for (const [field, kinds, reference] of [["voucherType", VOUCHERS, false], ["voucher", VOUCHERS, true], ["party", PARTIES, true], ["contactType", CONTACTS, false], ["channel", CHANNELS, false], ["tag", [], false], ["kinds", VOUCHERS, "list"]] as const) {
      // Exactly the union, in the model's order, once each, where it constrains the field; and no other member allowed anywhere under it.
      expect(membersAt(input.properties?.[field], input, reference), `${field}'s members`).toEqual(kinds);
      expect(kindsIn(input.properties?.[field], input), `${field}: no other member under it`).toEqual([...kinds].sort());
    }
    expect(got.mcp.accepted?.isError, JSON.stringify(got.mcp.accepted)).not.toBe(true);
    expect(got.mcp.refused?.isError, JSON.stringify(got.mcp.refused)).toBe(true);
    expect(JSON.stringify(got.mcp.refused)).toContain("InvalidPayload");
    expect(got.mcp.otherSameName?.isError, `MCP refuses the ledger's Customer as the crm's party type: ${JSON.stringify(got.mcp.otherSameName)}`).toBe(true);
    expect(JSON.stringify(got.mcp.otherSameName)).toContain("InvalidPayload");

    // The CLI: its help names each member a caller may pass, and never the unmounted one; its call with that one is refused.
    expect(got.cli.help.status, got.cli.help.stderr).toBe(0);
    const flags = flagsOf(got.cli.help.stdout);
    for (const [flag, kinds] of [["voucherType", VOUCHERS], ["voucher", VOUCHERS], ["party", PARTIES], ["contactType", CONTACTS], ["channel", CHANNELS]] as const) {
      expect(flags.get(flag), `the help has --${flag}`).toBeDefined();
      for (const kind of kinds) expect(flags.get(flag), `--${flag}'s help names ${kind}`).toContain(kind);
      // In the model's order.
      const where = kinds.map((k) => flags.get(flag)!.indexOf(k));
      expect(where, `--${flag}'s help names its members in order`).toEqual([...where].sort((a, b) => a - b));
      // Each flag names only its own set's members: the other set's, and the unmounted feature's, are not a value it takes.
      for (const kind of [...VOUCHERS, ...PARTIES, ...CONTACTS, ...CHANNELS, "Sales Invoice"].filter((k) => !kinds.includes(k))) expect(flags.get(flag), `--${flag}'s help doesn't name ${kind}`).not.toContain(kind);
    }
    expect(got.cli.help.stdout).not.toContain("Sales Invoice");
    expect(got.cli.accepted.status, got.cli.accepted.stderr).toBe(0);
    expect(got.cli.refused.status, "the CLI's call with an unmounted feature's member is refused").not.toBe(0);

    // Only the accepted calls wrote: the API's two, MCP's one and the CLI's one.
    const rows = postingsOf(root, name);
    expect(rows, JSON.stringify(rows)).toHaveLength(4);
    expect(rows.map((r) => Object.entries(r).find(([k]) => /^voucher_?type$/i.test(k))?.[1])).toEqual(["Payment Entry", "Journal Entry", "Payment Entry", "Payment Entry"]);
    expect(rows.map((r) => Object.entries(r).find(([k]) => /^channel$/i.test(k))?.[1])).toEqual(["Web", "Phone", "Web", "Web"]);
    expect(JSON.stringify(rows)).not.toContain("Sales Invoice");
  });
});
