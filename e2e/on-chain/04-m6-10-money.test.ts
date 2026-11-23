// Goal 4, slice 3 (M6.10), money's cases (`design/decisions/M6-money.md`, Aaron's answers of 21 November 2026; built in this slice beside the other values). Written by the
// checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first"). Not here: the CLI's and the client's formatting (slice 8), the docs and MCP sentences.
//
// WHAT IS REQUIRED, with the real `ortho model --json`, `ortho check`, and (for the wire) the front door's schema run in a project's own process:
//   1. the model carries `{ type: "money", bits, signed, asset }` on every money field: `asset` is `{ token: <name> }`, `{ currency: <name> }` (both named by the asset's file under
//      `blueprint/assets/`) or `{ field: <name> }` (the same row's field). Budgets' amounts (the allowance's `limit` and `spent`, spend's payload and answer, the events', the error's)
//      are `{ type: "money", bits: 128, signed: false, asset: { field: "token" } }` and `uint128`;
//   2. `Blueprint.money(asset, { signed: true })` is `signed: true` and `int<bits>`; `bits` as for uint (a multiple of 8, 8 to 256), default 128; no money has a Solidity type off a chain store;
//   3. `Blueprint.asset.token({ symbol, decimals })` and `Blueprint.asset.currency("EUR")` are default exports of `blueprint/assets/<name>.ts`, named by the path; an unknown currency code is
//      refused, naming the file (declared and used, and declared and unused);
//   4. refusal (a): `money.of(x)` is refused, naming the file and the field, when x is a field of another thing (in an operation, in an event of another thing), a value object that is in none
//      or in two of the thing's fields, a field that holds no asset (an id, a text), or when it is written outside any thing (a named value);
//   5. refusal (b): a currency asset on a chain-stored thing's field, or in an operation, event or error of one, is refused naming the file, the field and the asset;
//   6. an environment that runs a chain store and a thing that uses a fixed token asset, with no `assets: { <name>: Chain.evm.token("0x…") }`, is refused by `ortho check`, naming the asset;
//      bound, it is not; with no chain store in the environment, or no fixed token used, it is not;
//   4b. (tightened) a create whose payload carries a money.of amount must carry the asset field (grant without its token is refused); an account() field such as `member` is accepted as the asset
//      field (the compiler cannot tell a token from a wallet); a money field reused from another thing is refused; two money values are one when bits, signed and the resolved asset agree
//      (budgets' spend answer `remaining` is a field of the event's `remaining`, though they are separate objects; with other bits it is not);
//   6b. the binding is keyed by store: `assets: { usdc: { budgets: Chain.evm.token("0x…") } }`; check names the asset and the store; bound for another store is not bound;
//   8. the lock writes a money field as `{ value: "money", bits, signed, asset }`; `ortho check` reports as major a change of a money field's asset, bits or signed, and uint to money and back;
//   9. the real examples/budgets blueprint (which M6-money's change moves to money.of) compiles to { field: "token" } money.
//   7. the wire (c): the schema of a money field accepts only `^(0|[1-9][0-9]*)$` (`^(0|-?[1-9][0-9]*)$` when signed) within the bits' range, as a bigint of the digits, and refuses the rest.
//      Planted rows: 1.5, 1e3, 01, +1, -0, " 1", "1 USDC", -1 on unsigned, 2^128 on 128 bits, and more; each judged by an oracle written from the rule, not read from the output.
//
// A currency in a read: a read's fields are the thing's own, so the currency field of (b) is it; no separate case.
// WHERE THE SPELLING IS MINE. M6-money names `Blueprint.money(asset, { signed })`, `Blueprint.money.of(x)`, `Blueprint.asset.token`, `.currency`, `Chain.evm.token` and `{ bits }`; where `bits` is given for
// a fixed asset I pass it to `Blueprint.money(asset, { bits })`; `money.of(x, { signed, bits })` takes the same options (M6-money item 1) and the answer-equality rows pass them. The asset's model name is the file's name (`usdc`), the currency's lowercase file name. The refusals' words
// (`money`, `asset`, `currency`, `chain`, `bind`, `environment`) are the keywords of what is refused. The environment's `Chain.evm.network("anvil")` is the budgets example's own spelling.
//
// THE CONTROLS plant wrong outputs against `wireProblems` (a decoder that accepts each bad row, refuses each good one, returns the wrong bigint or a number), and `moneyProblems`.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lockProblems, solidityProblems } from "./chain-readers.ts";
import { copyOf, repo } from "../layer1/support.ts";
import { ASSETS, CHAIN_BASE, DB_BASE, NOTE, compiles, inFile, projectOf, put, refusalLines, refuses, run, swap, word, type AnyModel, type Files } from "./chain-fixture.ts";

const MONEY = (asset: Record<string, string>, bits = 128, signed = false) => ({ type: "money", bits, signed, asset });
const FIELD = MONEY({ field: "token" });
const THING = "things/allowance/thing.ts";
const FILE = inFile(`blueprint/${THING}`);
const SPEND = inFile("blueprint/things/allowance/verbs/spend.ts");
const USDC = 'import usdc from "../../assets/usdc.ts";\n';
const EUR = 'import eur from "../../assets/eur.ts";\n';
const withField = (extra: string, imports: string, base: Files = CHAIN_BASE): Files =>
  swap(swap({ ...ASSETS, ...base }, THING, "    spent: Blueprint.money.of(token),\n", `    spent: Blueprint.money.of(token),\n    ${extra},\n`), THING, 'import budgets from "../../stores/budgets.ts";\n', `import budgets from "../../stores/budgets.ts";\n${imports}`);

type Meta = Record<string, unknown>;
const valueOf = (x: unknown): Meta => (x as { value: Meta }).value;
/** What is wrong with the money fields of a list of `[where, field]`: each must carry exactly `want`. */
const moneyProblems = (fields: ReadonlyArray<readonly [string, unknown]>, want: Meta): ReadonlyArray<string> =>
  fields.filter(([, f]) => JSON.stringify(valueOf(f)) !== JSON.stringify(want)).map(([w, f]) => `${w}: value is ${JSON.stringify(valueOf(f))}, expected ${JSON.stringify(want)}`);

describe("controls: moneyProblems refuses a wrong money value", () => {
  const f = (v: Meta) => ({ value: v });
  it("accepts the right one, refuses a changed bits, signed, asset kind, asset name, a missing key and an extra key", () => {
    expect(moneyProblems([["a", f(FIELD)]], FIELD)).toEqual([]);
    for (const wrong of [{ ...FIELD, bits: 64 }, { ...FIELD, signed: true }, { ...FIELD, asset: { token: "token" } }, { ...FIELD, asset: { field: "tokens" } }, { type: "uint", bits: 128 }, { type: "money", bits: 128, signed: false }, { ...FIELD, decimals: 6 }]) expect(moneyProblems([["a", f(wrong)]], FIELD), JSON.stringify(wrong)).toHaveLength(1);
    expect(moneyProblems([["a", f(FIELD)], ["b", f({ ...FIELD, bits: 8 })]], FIELD)).toHaveLength(1);
  });
});

describe("1. the model carries money, and budgets' amounts count the allowance's token", () => {
  it("limit and spent, spend's payload and answer, the events' and the error's amounts, and grant's limit are all { field: token }, 128 bits, unsigned", () => {
    const m = compiles(CHAIN_BASE);
    const t = m.things["allowance"] as unknown as { fields: Record<string, unknown>; events: Record<string, Record<string, unknown>>; errors: Record<string, { fields: Record<string, unknown> }> };
    const ops = m.operations as unknown as Record<string, { payload: Record<string, unknown>; answer: Record<string, unknown> }>;
    const fields: Array<readonly [string, unknown]> = [
      ["limit", t.fields["limit"]], ["spent", t.fields["spent"]], ["spend.amount", ops["allowance.spend"]!.payload["amount"]], ["spend.remaining", ops["allowance.spend"]!.answer["remaining"]],
      ["grant.limit", ops["allowance.grant"]!.payload["limit"]], ["AllowanceGranted.limit", t.events["AllowanceGranted"]!["limit"]], ["AllowanceSpent.amount", t.events["AllowanceSpent"]!["amount"]],
      ["AllowanceSpent.remaining", t.events["AllowanceSpent"]!["remaining"]], ["AllowanceExceeded.remaining", t.errors["AllowanceExceeded"]!.fields["remaining"]],
    ];
    expect(moneyProblems(fields, FIELD), moneyProblems(fields, FIELD).join("\n")).toEqual([]);
    expect(solidityProblems(m)).toEqual([]);
    expect((t.fields["limit"] as { solidity?: string }).solidity).toBe("uint128");
    expect(valueOf(t.fields["token"])).toEqual({ type: "account" });
  });
  it("a fixed token, a currency, a signed amount and every bits, on a database thing, in the model", () => {
    const files: Files = {
      ...DB_BASE, ...ASSETS,
      "things/invoice/thing.ts": `import { Blueprint } from "orthograph";
import usdc from "../../assets/usdc.ts";
import eur from "../../assets/eur.ts";

export const Invoice = Blueprint.thing({
  description: "An amount someone owes.",
  fields: {
    id: Blueprint.id("inv"), price: Blueprint.money(usdc), euros: Blueprint.money(eur), fee: Blueprint.money(usdc, { signed: true }),
    small: Blueprint.money(usdc, { bits: 64 }), big: Blueprint.money(usdc, { signed: true, bits: 256 }),
  },
});
`,
    };
    const f = (compiles(files).things["invoice"] as unknown as { fields: Record<string, unknown> }).fields;
    expect(moneyProblems([["price", f["price"]]], MONEY({ token: "usdc" }))).toEqual([]);
    expect(moneyProblems([["euros", f["euros"]]], MONEY({ currency: "eur" }))).toEqual([]);
    expect(moneyProblems([["fee", f["fee"]]], MONEY({ token: "usdc" }, 128, true))).toEqual([]);
    expect(moneyProblems([["small", f["small"]]], MONEY({ token: "usdc" }, 64))).toEqual([]);
    expect(moneyProblems([["big", f["big"]]], MONEY({ token: "usdc" }, 256, true))).toEqual([]);
    expect(JSON.stringify(f)).not.toContain("solidity");
  });
});

describe("2. signed money is int<bits> on chain; unsigned is uint<bits>", () => {
  it("fee (signed, 64) is int64, ceiling (signed, default) int128, small (64) uint64, big (256) uint256", () => {
    const files = (withField('fee: Blueprint.money(usdc, { signed: true, bits: 64 }),\n    ceiling: Blueprint.money(usdc, { signed: true }),\n    small: Blueprint.money(usdc, { bits: 64 }),\n    big: Blueprint.money(usdc, { bits: 256 })', USDC));
    const m = compiles(files);
    const f = (m.things["allowance"] as unknown as { fields: Record<string, { solidity?: string }> }).fields;
    expect(Object.fromEntries(["fee", "ceiling", "small", "big"].map((k) => [k, f[k]?.solidity]))).toEqual({ fee: "int64", ceiling: "int128", small: "uint64", big: "uint256" });
    expect(solidityProblems(m)).toEqual([]);
  });
});

describe("3. assets are files, named by their paths; an unknown currency is refused naming the file", () => {
  const assetsWith = (code: string, used: boolean): Files => ({
    ...DB_BASE, ...ASSETS, "assets/eur.ts": `import { Blueprint } from "orthograph";\nexport default Blueprint.asset.currency("${code}");\n`,
    ...(used ? { "things/invoice/thing.ts": `import { Blueprint } from "orthograph";\nimport eur from "../../assets/eur.ts";\nexport const Invoice = Blueprint.thing({ description: "An amount.", fields: { id: Blueprint.id("inv"), euros: Blueprint.money(eur) } });\n` } : {}),
  });
  it("EUR, JPY and USD are known: each compiles, named by its file", () => {
    for (const code of ["EUR", "JPY", "USD"]) expect(compiles(assetsWith(code, true)).things["invoice"], code).toBeDefined();
  });
  for (const code of ["EURO", "XXZ", "eur", "E"]) {
    for (const used of [true, false]) it(`${JSON.stringify(code)}, ${used ? "used" : "declared and unused"}`, () => refuses(assetsWith(code, used), [inFile("blueprint/assets/eur.ts"), /currency|ISO|unknown|code/i]));
  }
});

describe("4. refusal (a): money.of is a field of the same thing", () => {
  const thingWith = (head: string, fields: string, files: Files = CHAIN_BASE): Files =>
    swap(swap(files, THING, "const token = Blueprint.account();", `const token = Blueprint.account();\n${head}`), THING, "    token,\n    limit: Blueprint.money.of(token),\n", `    token,\n${fields}`);
  const said: ReadonlyArray<RegExp> = [FILE, word("limit"), /money|asset/i];
  it("a value object that is in none of the thing's fields", () => refuses(thingWith("const stray = Blueprint.account();", "    limit: Blueprint.money.of(stray),\n"), said));
  it("a value object that is in two of the thing's fields", () => refuses(thingWith("", "    again: token,\n    limit: Blueprint.money.of(token),\n"), said));
  it("a field that holds no asset: a text", () => refuses(thingWith("const label = Blueprint.text({ max: 9 });", "    label,\n    limit: Blueprint.money.of(label),\n"), said));
  it("a field that holds no asset in an operation: the allowance's id", () => refuses(swap(CHAIN_BASE, "things/allowance/verbs/spend.ts", "amount: Blueprint.money.of(Allowance.fields.token)", "amount: Blueprint.money.of(Allowance.fields.id)"), [SPEND, word("amount"), /money|asset/i]));
  it("a field of another thing, in an operation", () => {
    const files = swap({ ...CHAIN_BASE, ...NOTE }, "things/allowance/verbs/spend.ts", "amount: Blueprint.money.of(Allowance.fields.token)", "amount: Blueprint.money.of(Note.fields.by)");
    refuses(swap(files, "things/allowance/verbs/spend.ts", 'import { grantee } from "../roles.ts";', 'import { grantee } from "../roles.ts";\nimport { Note } from "../../note/thing.ts";'), [SPEND, word("amount"), /money|asset/i]);
  });
  it("the token of the allowance, in an event of another thing", () => {
    const files = swap(swap({ ...CHAIN_BASE, ...NOTE }, "things/note/events.ts", "body: Note.fields.body });", "body: Note.fields.body, cost: Blueprint.money.of(Allowance.fields.token) });"), "things/note/events.ts", 'import { Note } from "./thing.ts";', 'import { Note } from "./thing.ts";\nimport { Allowance } from "../allowance/thing.ts";');
    refuses(files, [inFile("blueprint/things/note/events.ts"), word("cost"), /money|asset/i]);
  });
  it("written outside any thing: a named value in values/", () => refuses(put(CHAIN_BASE, "values/amount.ts", `import { Blueprint } from "orthograph";\nimport { Allowance } from "../things/allowance/thing.ts";\nexport const Amount = Blueprint.value(Blueprint.money.of(Allowance.fields.token));\n`), [inFile("blueprint/values/amount.ts"), /money|thing|asset/i]));
  it("controls: the same money.of, on the thing's own token, in its fields, operations, events and errors, compiles", () => { expect(compiles(CHAIN_BASE).things["allowance"]).toBeDefined(); });
});

describe("4b. the asset field of a create, an account field, a reused money field and the equality of two money values", () => {
  const GRANT = inFile("blueprint/things/allowance/verbs/grant.ts");
  const VOUCHER: Files = {
    "things/voucher/thing.ts": `import { Blueprint } from "orthograph";
import budgets from "../../stores/budgets.ts";

const token = Blueprint.account();
export const Voucher = Blueprint.thing({ description: "A voucher.", fields: { id: Blueprint.id("vch"), token, worth: Blueprint.money.of(token) }, lives: budgets });
`,
  };
  it("a grant whose payload carries the limit but not the token is refused, naming the operation and the field", () =>
    refuses(swap(CHAIN_BASE, "things/allowance/verbs/grant.ts", " token: Allowance.fields.token,", ""), [GRANT, word("token"), /money|asset|payload/i]));
  it("a field that is an account(), member, is accepted as an asset field (the journeys catch a wallet)", () => {
    expect(compiles(swap(CHAIN_BASE, "things/allowance/verbs/spend.ts", "amount: Blueprint.money.of(Allowance.fields.token)", "amount: Blueprint.money.of(Allowance.fields.member)")).operations["allowance.spend"]).toBeDefined();
  });
  it("a money field reused from another thing, in an operation on the allowance, is refused", () => {
    const files = swap({ ...CHAIN_BASE, ...VOUCHER }, "things/allowance/verbs/spend.ts", "amount: Blueprint.money.of(Allowance.fields.token)", "amount: Voucher.fields.worth");
    refuses(swap(files, "things/allowance/verbs/spend.ts", 'import { grantee } from "../roles.ts";', 'import { grantee } from "../roles.ts";\nimport { Voucher } from "../../voucher/thing.ts";'), [SPEND, word("amount"), /money|asset|another|thing/i]);
  });
  it("an answer with the same bits, signed and resolved asset is a field of the event's, though a separate object: budgets compiles", () => {
    expect(compiles(CHAIN_BASE).operations["allowance.spend"]).toBeDefined();
  });
  it("an answer with other bits is not the event's field: refused, naming the answer and the field", () =>
    refuses(swap(CHAIN_BASE, "things/allowance/verbs/spend.ts", "answer: { remaining: Blueprint.money.of(Allowance.fields.token) },", "answer: { remaining: Blueprint.money.of(Allowance.fields.token, { bits: 64 }) },"), [SPEND, word("remaining"), /answer|event/i]));
  it("an answer signed where the event's is unsigned is not the event's field either", () =>
    refuses(swap(CHAIN_BASE, "things/allowance/verbs/spend.ts", "answer: { remaining: Blueprint.money.of(Allowance.fields.token) },", "answer: { remaining: Blueprint.money.of(Allowance.fields.token, { signed: true }) },"), [SPEND, word("remaining"), /answer|event/i]));
});

describe("5. refusal (b): a currency asset on a chain store is refused", () => {
  const E = word("eur");
  it("a field of a chain-stored thing", () => refuses(withField("fiat: Blueprint.money(eur)", EUR), [FILE, word("fiat"), E, /currency|chain/i]));
  it("a payload field of one of its operations", () => {
    const files = swap(swap({ ...ASSETS, ...CHAIN_BASE }, "things/allowance/verbs/spend.ts", "payload: { allowance: Allowance.fields.id,", "payload: { extra: Blueprint.money(eur), allowance: Allowance.fields.id,"), "things/allowance/verbs/spend.ts", 'import { grantee } from "../roles.ts";', 'import { grantee } from "../roles.ts";\nimport eur from "../../../assets/eur.ts";');
    refuses(files, [SPEND, word("extra"), E, /currency|chain/i]);
  });
  it("an event field", () => {
    const files = swap(swap({ ...ASSETS, ...CHAIN_BASE }, "things/allowance/events.ts", "export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id });", "export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id, why: Blueprint.money(eur) });"), "things/allowance/events.ts", 'import { Allowance } from "./thing.ts";', `import { Allowance } from "./thing.ts";\n${EUR}`);
    refuses(files, [inFile("blueprint/things/allowance/events.ts"), word("why"), E, /currency|chain/i]);
  });
  it("an error field", () => {
    const files = swap(swap({ ...ASSETS, ...CHAIN_BASE }, "things/allowance/errors.ts", "{ remaining: Blueprint.money.of(Allowance.fields.token) }", "{ remaining: Blueprint.money.of(Allowance.fields.token), why: Blueprint.money(eur) }"), "things/allowance/errors.ts", 'import { Allowance } from "./thing.ts";', `import { Allowance } from "./thing.ts";\n${EUR}`);
    refuses(files, [inFile("blueprint/things/allowance/errors.ts"), word("why"), E, /currency|chain/i]);
  });
  it("a fixed token on a chain store is fine", () => { expect(compiles(withField("price: Blueprint.money(usdc)", USDC)).things["allowance"]).toBeDefined(); });
});

describe("6. an environment must bind the fixed token assets it uses on a chain", () => {
  const ENV = (assets: string, chain = true) => `import { Blueprint, Chain, Cloud, Identity, Telemetry } from "orthograph";

export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,
  database: Cloud.d1.local(),
${chain ? '  stores: { budgets: Chain.evm.network("anvil") },\n' : ""}${assets}  telemetry: [Telemetry.sink.local()],
});
`;
  const ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const BOUND = `  assets: { usdc: { budgets: Chain.evm.token("${ADDRESS}") } },\n`;
  const OTHER = `  assets: { usdc: { elsewhere: Chain.evm.token("${ADDRESS}") } },\n`;
  const USES = withField("price: Blueprint.money(usdc)", USDC);
  const checked = (files: Files) => { const p = projectOf(files); try { return run(p.root, "check"); } finally { p.remove(); } };
  const said = (out: string) => refusalLines(out, [word("usdc"), word("budgets"), /bind|environment/i]);
  /** Where nothing is refused: no line of check says bind or environment at all (a wrong check that refuses "asset token is not bound" would not say usdc and budgets together). */
  const silent = (out: string) => refusalLines(out, [/bind|environment/i]);
  it("a chain store and a fixed token used, with no binding: check refuses, naming usdc and the store budgets", () => {
    const c = checked(put(USES, "environments/local.ts", ENV("")));
    expect(c.status, c.out).toBe(1);
    expect(said(c.out), `no line holds usdc and budgets and bind or environment:\n${c.out}`).not.toEqual([]);
  });
  it("bound for another store only: still refused, naming the asset and budgets", () => {
    const c = checked(put(USES, "environments/local.ts", ENV(OTHER)));
    expect(c.status, c.out).toBe(1);
    expect(said(c.out), `no line holds usdc and budgets and bind or environment:\n${c.out}`).not.toEqual([]);
  });
  it("bound: not refused for it", () => { const c = checked(put(USES, "environments/local.ts", ENV(BOUND))); expect(silent(c.out), c.out).toEqual([]); expect(c.out).not.toContain("model ✘"); });
  it("no chain store in the environment: not refused", () => { const c = checked(put(USES, "environments/local.ts", ENV("", false))); expect(silent(c.out), c.out).toEqual([]); });
  it("a chain store and a token asset declared but used by nothing: not refused", () => { const c = checked(put({ ...ASSETS, ...CHAIN_BASE }, "environments/local.ts", ENV(""))); expect(silent(c.out), c.out).toEqual([]); });
  it("a chain store and only per-row tokens (the budgets shape): not refused", () => { const c = checked(put(CHAIN_BASE, "environments/local.ts", ENV(""))); expect(silent(c.out), c.out).toEqual([]); expect(c.out).not.toContain("model ✘"); });
});

// ---- 7. the wire ----

type Kind = "unsigned" | "signed" | "u8" | "of" | "uint" | "uint8";
const RANGE: Record<Kind, readonly [bigint, bigint]> = { uint: [0n, 2n ** 128n - 1n], uint8: [0n, 255n], unsigned: [0n, 2n ** 128n - 1n], of: [0n, 2n ** 128n - 1n], u8: [0n, 255n], signed: [-(2n ** 127n), 2n ** 127n - 1n] };
/** The rule of M6-money (c), written out: digits only, no leading zero, no `+`, no `-0`, `-` only when signed, within the range. */
const oracle = (kind: Kind, text: unknown): boolean => {
  if (typeof text !== "string") return false;
  const ok = kind === "signed" ? /^(0|-?[1-9][0-9]*)$/.test(text) : /^(0|[1-9][0-9]*)$/.test(text);
  if (!ok) return false;
  const n = BigInt(text);
  return n >= RANGE[kind][0] && n <= RANGE[kind][1];
};
type Seen = readonly [Kind, unknown, "ok" | "refused", string?, string?, string?];
/** What is wrong with a decoder's answers: a row accepted that the rule refuses, refused that it accepts, or accepted as anything but the bigint of its digits. */
const wireProblems = (seen: ReadonlyArray<Seen>): ReadonlyArray<string> =>
  seen.flatMap(([kind, text, verdict, value, type, encoded]) => {
    const at = `${kind} ${JSON.stringify(text)}`;
    if (!oracle(kind, text)) return verdict === "ok" ? [`${at}: accepted, but refused by the rule`] : [];
    return verdict !== "ok" ? [`${at}: refused, but the rule accepts it`] : value !== String(text) || type !== "bigint" ? [`${at}: decoded as ${String(value)} (${String(type)}), not the bigint ${String(text)}`] : encoded === text ? [] : [`${at}: encoded back as ${JSON.stringify(encoded)}, not the digits ${JSON.stringify(text)}`];
  });

const MAX = 2n ** 128n - 1n;
const ROWS: ReadonlyArray<readonly [Kind, unknown]> = [
  ...["0", "1", "10", "1250000", String(MAX), "9", "100"].map((t) => ["unsigned", t] as const),
  ...["1.5", "1e3", "01", "+1", "-0", " 1", "1 USDC", "-1", "", "1 ", "0x10", "00", "1_000", "٣", "1\n", String(MAX + 1n), String(2n ** 200n), 1, null].map((t) => ["unsigned", t] as const),
  ...["0", "1", "-1", String(-(2n ** 127n)), String(2n ** 127n - 1n)].map((t) => ["signed", t] as const),
  ...["-0", "01", "-01", "+1", "1.5", "--1", "-", String(2n ** 127n), String(-(2n ** 127n) - 1n), "-1e3", "- 1"].map((t) => ["signed", t] as const),
  ...["0", "7", "1250000", String(MAX)].map((t) => ["uint", t] as const),
  ...["007", "-0", "00", "+1", "1.5", "1e3", " 1", "-1", String(MAX + 1n)].map((t) => ["uint", t] as const),
  ["uint8", "255"], ["uint8", "256"], ["uint8", "010"],
  ["u8", "255"], ["u8", "256"], ["u8", "-1"], ["of", "1"], ["of", "-1"], ["of", String(MAX + 1n)], ["of", "1.5"],
];

describe("controls: wireProblems refuses a decoder that is wrong on one row", () => {
  const right = (): Seen[] => ROWS.map(([k, t]) => (oracle(k, t) ? [k, t, "ok", String(t), "bigint", String(t)] : [k, t, "refused"]) as Seen);
  it("accepts the right answers", () => expect(wireProblems(right())).toEqual([]));
  it("refuses an encode that does not give the digits back: a number, a padded or a signed-plus string, or none", () => {
    for (const enc of ["10n", "010", "+10", "10.0", undefined]) expect(wireProblems(right().map((s) => (s[0] === "unsigned" && s[1] === "10" ? ([s[0], s[1], "ok", "10", "bigint", enc] as Seen) : s))), String(enc)).toHaveLength(1);
  });
  it("refuses each bad row accepted, each good row refused, a number or a wrong value, one at a time", () => {
    for (const bad of ["1.5", "1e3", "01", "+1", "-0", " 1", "1 USDC", "-1", String(MAX + 1n)]) {
      const seen = right().map((s) => (s[0] === "unsigned" && s[1] === bad ? ([s[0], s[1], "ok", String(s[1]), "bigint", String(s[1])] as Seen) : s));
      expect(wireProblems(seen), bad).toHaveLength(1);
    }
    expect(wireProblems(right().map((s) => (s[0] === "unsigned" && s[1] === "1250000" ? ([s[0], s[1], "refused"] as Seen) : s)))).toHaveLength(1);
    expect(wireProblems(right().map((s) => (s[0] === "signed" && s[1] === "-1" ? ([s[0], s[1], "refused"] as Seen) : s)))).toHaveLength(1);
    expect(wireProblems(right().map((s) => (s[0] === "unsigned" && s[1] === "10" ? ([s[0], s[1], "ok", "10", "number", "10"] as Seen) : s)))).toHaveLength(1);
    expect(wireProblems(right().map((s) => (s[0] === "unsigned" && s[1] === "10" ? ([s[0], s[1], "ok", "11", "bigint", "11"] as Seen) : s)))).toHaveLength(1);
    expect(wireProblems(right().map((s) => (s[0] === "u8" && s[1] === "256" ? ([s[0], s[1], "ok", "256", "bigint", "256"] as Seen) : s)))).toHaveLength(1);
  });
});

/** Runs the script in the project's own process, so `orthograph` and `effect` resolve as they do for a user. */
const decodeRows = (root: string, rows: unknown) => spawnSync(process.execPath, [join(root, "wire.ts"), JSON.stringify(rows)], { cwd: root, encoding: "utf8" });

const SCRIPT = `import { Blueprint } from "orthograph";
import { Schema } from "effect";
const usdc = Blueprint.asset.token({ symbol: "USDC", decimals: 6 });
const kinds = { unsigned: Blueprint.money(usdc), signed: Blueprint.money(usdc, { signed: true }), u8: Blueprint.money(usdc, { bits: 8 }), uint: Blueprint.uint(128), uint8: Blueprint.uint(8), of: Blueprint.money.of(Blueprint.account()) };
const rows = JSON.parse(process.argv[2]);
const out = rows.map(([kind, text]) => {
  try { const v = Schema.decodeUnknownSync(kinds[kind].schema)(text); return [kind, text, "ok", String(v), typeof v, Schema.encodeSync(kinds[kind].schema)(v)]; } catch { return [kind, text, "refused"]; }
});
console.log(JSON.stringify(out));
`;

describe("7. the wire: the schema of money, and of uint, takes base-unit digits only", () => {
  it("accepts exactly what (c) accepts, within the bits' range, as the bigint of its digits, and refuses every planted row", () => {
    const p = projectOf({});
    try {
      writeFileSync(join(p.root, "wire.ts"), SCRIPT);
      const ran = decodeRows(p.root, ROWS);
      expect(ran.status, ran.stderr.slice(0, 1500)).toBe(0);
      const seen = JSON.parse(ran.stdout) as Seen[];
      expect(seen).toHaveLength(ROWS.length);
      expect(wireProblems(seen), wireProblems(seen).join("\n")).toEqual([]);
    } finally { p.remove(); }
  });
});

// ---- 8. the lock and the version ----

const MONEY_VALUE = (asset: Record<string, string>, bits = 128, signed = false) => `Blueprint.value(Blueprint.money(${asset["token"] ? "usdc" : "eur"}, { bits: ${bits}, signed: ${signed} }))`;
const amounts = (spec: string): Files => ({ ...DB_BASE, ...ASSETS, "values/amounts.ts": `import { Blueprint } from "orthograph";\nimport usdc from "../assets/usdc.ts";\nimport eur from "../assets/eur.ts";\nvoid usdc; void eur;\nexport const Cap = ${spec};\n` });

describe("8. the lock writes money as { value: money, bits, signed, asset }", () => {
  it("a declared error's money field: a token and a currency, with their bits and sign", () => {
    const files = put(amounts(MONEY_VALUE({ token: "usdc" }, 64)), "things/ticket/errors.ts", `import { Blueprint } from "orthograph";
import usdc from "../../assets/usdc.ts";
import eur from "../../assets/eur.ts";

export class TicketTooBig extends Blueprint.error({ cap: Blueprint.money(usdc, { bits: 64 }), fee: Blueprint.money(eur, { signed: true }) }, { exit: 10 }) {}
export class TicketBusy extends Blueprint.error({}, { exit: 11 }) {}
`);
    const p = projectOf(files);
    try {
      const g = run(p.root, "generate");
      expect(g.status, g.err + g.out.slice(-600)).toBe(0);
      const lock = JSON.parse(readFileSync(join(p.root, "blueprint/refusals.lock"), "utf8")) as { refusals: Record<string, { fields: Record<string, unknown> }> };
      expect(lock.refusals["TK-001"]?.fields).toEqual({
        cap: { value: "money", bits: 64, signed: false, asset: { token: "usdc" } },
        fee: { value: "money", bits: 128, signed: true, asset: { currency: "eur" } },
      });
      expect(lockProblems(readFileSync(join(p.root, "blueprint/refusals.lock"), "utf8"), { prefixes: { ticket: "TK" }, solidity: false })).toEqual([]);
    } finally { p.remove(); }
  });
});

describe("8. ortho check reports a change of a money field as major", () => {
  const major = (before: string, after: string): string => {
    const p = projectOf(amounts(before));
    try {
      const g = run(p.root, "generate");
      expect(g.status, g.err + g.out.slice(-600)).toBe(0);
      writeFileSync(join(p.root, "blueprint/values/amounts.ts"), amounts(after)["values/amounts.ts"]!);
      const model = run(p.root, "model", "--json");
      expect(model.status, model.err.slice(0, 1200)).toBe(0);
      return run(p.root, "check").out;
    } finally { p.remove(); }
  };
  const says = (out: string) => refusalLines(out, [/cap|ticket/i, /\bmajor\b/i]).length > 0;
  const U64 = "Blueprint.value(Blueprint.uint(64))";
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    ["uint becomes money", U64, MONEY_VALUE({ token: "usdc" }, 64)],
    ["money becomes uint", MONEY_VALUE({ token: "usdc" }, 64), U64],
    ["the asset changes (usdc to eur)", MONEY_VALUE({ token: "usdc" }, 64), MONEY_VALUE({ currency: "eur" }, 64)],
    ["the bits change (64 to 128)", MONEY_VALUE({ token: "usdc" }, 64), MONEY_VALUE({ token: "usdc" }, 128)],
    ["signed changes (false to true)", MONEY_VALUE({ token: "usdc" }, 64), MONEY_VALUE({ token: "usdc" }, 64, true)],
  ];
  for (const [name, before, after] of cases) it(name, () => { const out = major(before, after); expect(says(out), `no line holds cap or ticket and major:\n${out}`).toBe(true); });
  it("nothing changed: no major", () => {
    const out = major(MONEY_VALUE({ token: "usdc" }, 64), MONEY_VALUE({ token: "usdc" }, 64));
    expect(refusalLines(out, [/\bmajor\b/i])).toEqual([]);
  });
});

describe("9. the real examples/budgets blueprint counts its amounts in the allowance's token", () => {
  it("ortho model --json on a copy of the example (its journeys left out: they need later slices): every amount is { field: token }, 128 bits, unsigned, uint128", () => {
    const copy = copyOf(join(repo, "examples/budgets"), ["ortho.config.ts", "blueprint", "package.json"]);
    try {
      const r = run(copy.root, "model", "--json");
      expect(r.status, r.err.slice(0, 1500)).toBe(0);
      const m = JSON.parse(r.out) as AnyModel;
      const t = m.things["allowance"] as unknown as { fields: Record<string, { value: Meta; solidity?: string }>; events: Record<string, Record<string, { value: Meta }>> };
      const ops = m.operations as unknown as Record<string, { payload: Record<string, { value: Meta }>; answer: Record<string, { value: Meta }> }>;
      const fields: Array<readonly [string, unknown]> = [
        ["limit", t.fields["limit"]], ["spent", t.fields["spent"]], ["spend.amount", ops["allowance.spend"]!.payload["amount"]], ["spend.remaining", ops["allowance.spend"]!.answer["remaining"]],
        ["AllowanceSpent.amount", t.events["AllowanceSpent"]!["amount"]], ["AllowanceSpent.remaining", t.events["AllowanceSpent"]!["remaining"]],
      ];
      expect(moneyProblems(fields, FIELD), moneyProblems(fields, FIELD).join("\n")).toEqual([]);
      expect(t.fields["limit"]?.solidity).toBe("uint128");
    } finally { copy.remove(); }
  });
});
