// Goal 4, slice 3 (M6.10), second check: the values a chain store refuses (`design/decisions/M6-chain.md` item 2; K25 item 5: "a public chain shows every
// field"). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. A thing that lives in a chain store, with one field of each of these, is refused by the compiler, through both of the user's ways in:
// `ortho model` exits 2 with the problems on stderr and prints nothing on stdout, and `ortho check` exits 1 and prints them under `model ✘`. In each, a line
// names the blueprint file, the thing's field (or the value) and what is wrong, in a word the case owns:
//   - `Blueprint.email()`: email; `Blueprint.visibility.secret(...)`: secret; `Blueprint.visibility.private(..., role)`: private;
//   - a `schema(...)` value (`Blueprint.value(Schema.Struct(...))`, `Blueprint.value(Schema.String)`, `Blueprint.refAny()`) that declares no Solidity type;
//   - `Blueprint.id(prefix)` whose prefix leaves no room for a minted suffix in 32 bytes (the Effect runtime mints `<prefix>_` and 16 more characters, so 28
//     and 32 characters are certain, and so is 16); a prefix of 3 and of 12 fit;
//   - `Blueprint.uint(bits)` that is not a multiple of 8, or is above 256 (or 0): a uint with no Solidity type.
// The same blueprint with the field left out compiles (the control that the refusal is the field's, not the store's), and the same kinds of field on a
// database-only thing compile today and must go on compiling (a database shows no one's email on a public chain).
// A line that only says the file could not load (today's "can't load ...: TypeError") is not a refusal of the case: it must say the field and the word.
// The thing is named by the file's path.
// Where the refusal is raised (the compiler's problems, the loader) is the builder's choice, as long as it is a line the user reads in both commands.
//
// THE CONTROLS plant hollow refusals against `refusalLines` (in `chain-fixture.ts`): a loader's "can't load ..." line, a line with the word but not the file,
// one with the file but not the field, and one naming the wrong field. Each must not count.
import { describe, expect, it } from "vitest";
import { ASSETS, CHAIN_BASE, DB_BASE, NOTE, compiles, inFile, put, refuses, refusalLines, swap, word, type Files } from "./chain-fixture.ts";

const THING = "things/allowance/thing.ts";
const FILE = inFile("blueprint/things/allowance/thing.ts");
const field = (extra: string, imports = "") => swap(swap(CHAIN_BASE, THING, "    spent: Blueprint.money.of(token),\n", `    spent: Blueprint.money.of(token),\n    ${extra},\n`), THING, 'import budgets from "../../stores/budgets.ts";\n', `import budgets from "../../stores/budgets.ts";\n${imports}`);

describe("controls: refusalLines counts only a line that says the file, the field and the word", () => {
  const needs = [FILE, word("contact"), /email/i] as const;
  it("counts the line that says all three", () => expect(refusalLines("  - blueprint/things/allowance/thing.ts: field contact is an email, which a public chain would show", needs)).toHaveLength(1));
  it("does not count today's loader failure, a line without the file, one without the field, one without the word, or one naming another field", () => {
    expect(refusalLines("can't load blueprint/stores/budgets.ts: TypeError: Cannot read properties of undefined (reading 'evm')", needs)).toEqual([]);
    expect(refusalLines("  - field contact is an email", needs)).toEqual([]);
    expect(refusalLines("  - blueprint/things/allowance/thing.ts: an email", needs)).toEqual([]);
    expect(refusalLines("  - blueprint/things/allowance/thing.ts: field contact is not allowed", needs)).toEqual([]);
    expect(refusalLines("  - blueprint/things/allowance/thing.ts: field contacts is an email", needs)).toEqual([]);
  });
});

const TICKET_WITH_ALL = (role: string) => `import { Blueprint } from "orthograph";
import { Schema } from "effect";
${role}import { Cap } from "../../values/amounts.ts";
export const Ticket = Blueprint.thing({
  description: "A piece of work someone asked for.",
  code: "TK",
  fields: {
    // The long prefix is the thing's own id, the one a chain store refuses (below): a second id field must name a prefix some thing owns (Goal 18's slice 9 found the old
    // fixture, a second field with the long prefix, refused for that, not for its length).
    id: Blueprint.id("a-prefix-that-is-far-too-long-for-chain"), title: Blueprint.text({ max: 80 }), cap: Cap,
    contact: Blueprint.email(), pin: Blueprint.visibility.secret(Blueprint.text({ max: 40 })),
    extra: Blueprint.value(Schema.Struct({ a: Schema.String })), ref: Blueprint.refAny(), odd: Blueprint.uint(12),
    ${role === "" ? "" : "balance: Blueprint.visibility.private(Blueprint.uint(64), grantee),"}
  },
});
`;

describe("controls, true today: the same kinds of field on a database thing compile", () => {
  it("a database-only project may hold an email, a secret, a schema value, a long id prefix and a uint(12)", () => {
    expect(compiles(put(DB_BASE, "things/ticket/thing.ts", TICKET_WITH_ALL(""))).things["ticket"]).toBeDefined();
  });
});

describe("the same kinds of field on a database thing compile beside a chain store: the refusal is the chain store's, not the project's", () => {
  it("ticket (database) keeps its email, secret, private field, schema values, long id prefix and uint(12), in a project that has an allowance on chain", () => {
    const m = compiles({ ...CHAIN_BASE, ...put(DB_BASE, "things/ticket/thing.ts", TICKET_WITH_ALL('import { grantee } from "../allowance/roles.ts";\n')) });
    expect(m.things["ticket"]).toBeDefined();
    expect(m.things["allowance"]?.store).toBe("budgets");
  });
});

describe("the base compiles, so each refusal below is the one field's", () => {
  it("the allowance without any of these fields compiles", () => { expect(compiles({ ...CHAIN_BASE, ...NOTE }).things["allowance"]).toBeDefined(); });
});

describe("a chain store refuses what a public chain would show", () => {
  it("an email field", () => refuses(field("contact: Blueprint.email()"), [FILE, word("contact"), /email/i]));
  it("a secret field", () => refuses(field("pin: Blueprint.visibility.secret(Blueprint.text({ max: 40 }))"), [FILE, word("pin"), /secret/i]));
  it("a secret value kept as a field (a named value marked secret)", () => refuses(field("pin: Blueprint.visibility.secret(Blueprint.uint(64))"), [FILE, word("pin"), /secret/i]));
  it("a private field, private to a role", () => {
    const files = put(NOTE, "things/note/thing.ts", NOTE["things/note/thing.ts"]!
      .replace('import { Allowance } from "../allowance/thing.ts";', 'import { Allowance } from "../allowance/thing.ts";\nimport { grantee } from "../allowance/roles.ts";')
      .replace("    by: Blueprint.account(),", "    by: Blueprint.account(),\n    balance: Blueprint.visibility.private(Blueprint.uint(64), grantee),"));
    refuses({ ...CHAIN_BASE, ...files }, [inFile("blueprint/things/note/thing.ts"), word("balance"), /private/i]);
  });
  it("a private field on an event, private to a role", () => refuses(
    swap(swap(CHAIN_BASE, "things/allowance/events.ts", "export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id });", "export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id, why: Blueprint.visibility.private(Blueprint.uint(64), grantee) });"), "things/allowance/events.ts", 'import { Allowance } from "./thing.ts";', 'import { Allowance } from "./thing.ts";\nimport { grantee } from "./roles.ts";'),
    [inFile("blueprint/things/allowance/events.ts"), word("why"), /private/i],
  ));
  it("a secret value on an event field", () => refuses(
    swap(CHAIN_BASE, "things/allowance/events.ts", "export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id });", "export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id, why: Blueprint.visibility.secret(Blueprint.text({ max: 20 })) });"),
    [inFile("blueprint/things/allowance/events.ts"), word("why"), /secret/i], [FILE, word("why"), /secret/i],
  ));
});

describe("a schema value with no Solidity type is refused", () => {
  const schema = (value: string) => field(`extra: ${value}`, 'import { Schema } from "effect";\n');
  const said: ReadonlyArray<RegExp> = [FILE, word("extra"), /schema|solidity/i];
  it("a struct", () => refuses(schema("Blueprint.value(Schema.Struct({ a: Schema.String }))"), said));
  it("a plain Schema.String wrapped as a value", () => refuses(schema("Blueprint.value(Schema.String)"), said));
  it("a Blueprint.refAny() reference", () => refuses(field("extra: Blueprint.refAny()"), said));
});

describe("an id whose prefix leaves no room to mint a suffix in 32 bytes is refused", () => {
  const prefixed = (prefix: string) => swap(CHAIN_BASE, THING, 'id: Blueprint.id("alw"),', `id: Blueprint.id("${prefix}"),`);
  const said = (prefix: string): ReadonlyArray<RegExp> => [FILE, word("id"), /32|bytes32|room|long|prefix/i, new RegExp(prefix)];
  it("a prefix of 13 and of 15 fit too (15, an underscore and 16 minted characters are 32 bytes)", () => {
    for (const n of [13, 15]) expect(compiles(prefixed("a".repeat(n))).things["allowance"]?.fields["id"]?.value, String(n)).toMatchObject({ type: "id", prefix: "a".repeat(n) });
  });
  it("a prefix of 3 and of 12 fit", () => {
    expect(compiles(prefixed("alw")).things["allowance"]).toBeDefined();
    expect(compiles(prefixed("allowancesxx")).things["allowance"]?.fields["id"]?.value).toMatchObject({ type: "id", prefix: "allowancesxx" });
  });
  for (const n of [16, 28, 32, 40]) {
    const prefix = "a".repeat(n);
    it(`a prefix of ${n} characters`, () => refuses(prefixed(prefix), said(prefix), [FILE, word("id"), /32/, /prefix/i]));
  }
});

describe("a uint or a money that is no Solidity width is refused", () => {
  const widths = (spec: (n: number) => string) => (n: number): Files => field(`odd: ${spec(n)}`);
  const said: ReadonlyArray<RegExp> = [FILE, word("odd"), /bits|uint|int|8/i];
  const uint = widths((n) => `Blueprint.uint(${n})`);
  const money = (n: number): Files => ({ ...ASSETS, ...field(`odd: Blueprint.money(usdc, { bits: ${n} })`, 'import usdc from "../../assets/usdc.ts";\n') });
  it("8, 128 and 256 are fine, as uint and as money", () => { for (const n of [8, 128, 256]) { expect(compiles(uint(n)).things["allowance"]).toBeDefined(); expect(compiles(money(n)).things["allowance"]).toBeDefined(); } });
  for (const n of [0, 7, 12, 260, 264]) {
    it(`uint(${n})`, () => refuses(uint(n), said));
    it(`money of a token asset with bits ${n}`, () => refuses(money(n), said));
  }
});
