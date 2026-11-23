// Goal 4, slice 3 (M6.10), third check: what the compiler refuses in an operation, a read or a thing of a chain store (`design/decisions/M6-chain.md` items 5, 7,
// 8 and 9; K25 item 6). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. Each blueprint below is the budgets shape with one change, and the compiler refuses it through both of the user's ways in: `ortho model`
// exits 2 with the problems on stderr (nothing on stdout) and `ortho check` exits 1 and prints them under `model ✘`; in each a line names the blueprint
// file (its path names the thing or the operation) and the word the case owns:
//   roles: a `rule` role on an operation (the operation and the role named); `Blueprint.signedIn` on an operation;
//   steps and options: a `database` step (plain and with `writes`), an `actor` step, `idempotent`, `runs` ("server", and "chain": an author never writes it),
//     `signedBy`;
//   answers: an answer field that is neither a field of the move's event nor the new row's id (on a spend, a revoke and a grant);
//   reads: a read of a chain-stored thing allowed to a role, to `signedIn`, or to anyone and a role: only `[Blueprint.anyone]` is public;
//   collisions in the generated contract: a payload field named signer, nonce, deadline or signature; an operation named like a generated entry (`nonces`,
//     `has-role`, `eip712-domain`, `grant-role`, `revoke-role`), and a read named the same; an operation `spend-by-sig` beside `spend`;
//   invariants: a chain-stored thing that declares an invariant (a chain store given rules refuses them).
// The base compiles, and so does the same operation with what is still allowed (a budget, an error, an answer from the event, a read for anyone, two roles).
//
// WHERE THE WORDS ARE MINE. M6-chain fixes what is refused and that the compiler names the operation, not the message's words; the word each case owns
// (`rule`, `signedIn`, `database`, `actor`, `idempotent`, `runs`, `signedBy`, `answer`, `anyone`, the payload's field name, `BySig`, `invariant`) is the
// checks author's reading: the keyword of the thing refused. A message that names the file and the keyword passes.
//
// THE CONTROLS: `refusalLines` is planted in `04-m6-10-values-refused.test.ts` (a loader failure, a line without the file, the word or the name does not count);
// here, `swap` throws when what it replaces is not in the file, so a stale fixture fails rather than refusing nothing.
import { describe, expect, it } from "vitest";
import { CHAIN_BASE, DB_BASE, compiles, inFile, put, refuses, refusesWith, swap, word, type Files } from "./chain-fixture.ts";

const V = "things/allowance/verbs";
const SPEND = inFile(`blueprint/${V}/spend.ts`);
const GRANT = inFile(`blueprint/${V}/grant.ts`);
const REVOKE = inFile(`blueprint/${V}/revoke.ts`);
const GET = inFile(`blueprint/${V}/get.ts`);

/** The spend operation with one more property, written just before `allowed`. */
const spendWith = (line: string, base: Files = CHAIN_BASE): Files => swap(base, `${V}/spend.ts`, "  allowed: [grantee],\n", `  ${line}\n  allowed: [grantee],\n`);
const withRule = (files: Files): Files => put(files, "things/allowance/roles.ts", `${files["things/allowance/roles.ts"]}export const auditor = Blueprint.role(Allowance, { rule: () => true });\n`);
/** The words of the options an operation may not declare: a line that is one case's refusal must not carry another's. */
// Only the words that are never anything but an option's name: a correct message may say "a chain operation runs on chain, so declares no database step" or name an actor.
const OPTIONS = { rule: /\brule\b/i, signedIn: /signedIn|signed.in/i, idempotent: /idempotent/i, signedBy: /signedBy/ } as const;
const only = (own: string, files: Files, ...alternatives: ReadonlyArray<ReadonlyArray<RegExp>>) =>
  refusesWith(files, Object.entries(OPTIONS).filter(([k]) => k !== own).map(([, r]) => r), ...alternatives);
const allowedSpend = (allowed: string, files: Files = CHAIN_BASE): Files => swap(files, `${V}/spend.ts`, "  allowed: [grantee],\n", `  allowed: [${allowed}],\n`);

describe("what is still allowed on a chain operation", () => {
  it("the budgets shape compiles", () => { expect(Object.keys(compiles(CHAIN_BASE).operations).sort()).toEqual(["allowance.get", "allowance.grant", "allowance.revoke", "allowance.spend"]); });
  it("a budget, a declared error, an answer from the move's event and two who roles on one operation compile", () => {
    const files = swap(allowedSpend("grantee, treasury", spendWith('budget: { p95: "5 seconds" },')), `${V}/spend.ts`, 'import { grantee } from "../roles.ts";', 'import { grantee, treasury } from "../roles.ts";');
    expect(compiles(files).operations["allowance.spend"]).toBeDefined();
  });
  it("a grant that answers its new id and a field of its event compiles", () => {
    const files = swap(CHAIN_BASE, `${V}/grant.ts`, "answer: { allowance: Allowance.fields.id },", "answer: { allowance: Allowance.fields.id, token: Allowance.fields.token },");
    expect(compiles(files).operations["allowance.grant"]).toBeDefined();
  });
});

describe("controls: what a database operation, and a name that only looks like a collision, may still do", () => {
  const OPEN = "things/ticket/verbs/open.ts";
  const MIXED: Files = { ...CHAIN_BASE, ...DB_BASE };
  const dbOp = (line: string, base: Files) => swap(base, OPEN, "  allowed: [Blueprint.anyone],\n", `  allowed: [Blueprint.anyone],\n  ${line}\n`);
  for (const [name, edit] of [
    ["idempotent", (b: Files) => dbOp('idempotent: "request",', b)],
    ["signedIn", (b: Files) => swap(b, OPEN, "allowed: [Blueprint.anyone],", "allowed: [Blueprint.signedIn],")],
    ["a payload field named nonce", (b: Files) => swap(b, OPEN, "payload: { title: Ticket.fields.title,", "payload: { nonce: Ticket.fields.cap, title: Ticket.fields.title,")],
  ] as const) {
    it(`a database operation with ${name} compiles, alone`, () => { expect(compiles(edit(DB_BASE)).operations["ticket.open"]).toBeDefined(); });
    it(`a database operation with ${name} compiles, beside a chain store`, () => { expect(compiles(edit(MIXED)).operations["ticket.open"]).toBeDefined(); });
  }
  const spendWithPayload = (extra: string) => swap(CHAIN_BASE, `${V}/spend.ts`, "payload: { allowance: Allowance.fields.id,", `payload: { ${extra}: Blueprint.money.of(Allowance.fields.token), allowance: Allowance.fields.id,`);
  for (const f of ["signers", "deadlines", "nonces", "signatures"]) it(`a payload field named ${f} compiles`, () => { expect(compiles(spendWithPayload(f)).operations["allowance.spend"]).toBeDefined(); });
  it("an operation named has-roles compiles", () => { expect(compiles(put(CHAIN_BASE, `${V}/has-roles.ts`, CHAIN_BASE[`${V}/revoke.ts`]!)).operations["allowance.has-roles"]).toBeDefined(); });
  it("a lone spend-by-sig, with no spend, compiles", () => {
    const files = put(put(CHAIN_BASE, `${V}/spend.ts`, null), `${V}/spend-by-sig.ts`, CHAIN_BASE[`${V}/spend.ts`]!);
    expect(compiles(files).operations["allowance.spend-by-sig"]).toBeDefined();
  });
});

describe("a role a contract cannot run is refused", () => {
  it("a rule role on an operation, naming the operation and the role", () => {
    const files = swap(allowedSpend("auditor", withRule(CHAIN_BASE)), `${V}/spend.ts`, 'import { grantee } from "../roles.ts";', 'import { auditor } from "../roles.ts";');
    only("rule", files, [SPEND, word("auditor"), /rule/i]);
  });
  it("Blueprint.signedIn on an operation: every caller on chain has signed", () => only("signedIn", allowedSpend("Blueprint.signedIn"), [SPEND, /signedIn|signed.in/i]));
});

describe("what an operation of a chain-stored thing does not declare is refused, naming each", () => {
  it("a database step", () => only("database", spendWith("steps: { save: Blueprint.step.database() },"), [SPEND, /database/i]));
  it("a database step that names what it writes", () => only("database", spendWith("steps: { save: Blueprint.step.database({ writes: [Allowance] }) },"), [SPEND, /database/i]));
  it("an actor step", () => only("actor", spendWith('steps: { save: { kind: "step", type: "actor" } as never },'), [SPEND, /actor/i]));
  it("idempotent: the nonce makes every call land at most once", () => only("idempotent", spendWith('idempotent: "request",'), [SPEND, /idempotent/i]));
  it("runs: \"server\"", () => only("runs", spendWith('runs: "server",'), [SPEND, /runs/i]));
  it("runs: \"chain\": an author never writes it", () => only("runs", spendWith('runs: "chain",'), [SPEND, /runs/i]));
  it("signedBy: both the caller and the signer are the role's, so no one writes it", () => only("signedBy", spendWith("// @ts-ignore: not a property any more\n  signedBy: grantee,"), [SPEND, /signedBy/]));
});

describe("an answer must be read from the move's event or be the new id", () => {
  it("a spend answering a field its event does not carry", () => refuses(swap(CHAIN_BASE, `${V}/spend.ts`, "answer: { remaining: Blueprint.money.of(Allowance.fields.token) },", "answer: { remaining: Blueprint.money.of(Allowance.fields.token), extra: Blueprint.money.of(Allowance.fields.token) },"), [SPEND, word("extra"), /answer|event/i]));
  it("a revoke answering a field of the thing its event does not carry", () => refuses(swap(CHAIN_BASE, `${V}/revoke.ts`, "answer: {},", "answer: { limit: Allowance.fields.limit },"), [REVOKE, word("limit"), /answer|event/i]));
  it("a grant answering a field its event does not carry beside the new id", () => refuses(swap(CHAIN_BASE, `${V}/grant.ts`, "answer: { allowance: Allowance.fields.id },", "answer: { allowance: Allowance.fields.id, spent: Allowance.fields.spent },"), [GRANT, word("spent"), /answer|event/i]));
});

describe("a read of a chain-stored thing is public: only [Blueprint.anyone]", () => {
  const read = (allowed: string): Files => swap(swap(CHAIN_BASE, `${V}/get.ts`, "allowed: [Blueprint.anyone],", `allowed: [${allowed}],`), `${V}/get.ts`, 'import { Allowance } from "../thing.ts";\n', 'import { Allowance } from "../thing.ts";\nimport { grantee } from "../roles.ts";\n');
  it("allowed to a role", () => refuses(read("grantee"), [GET, /anyone|public/i]));
  it("allowed to signedIn", () => refuses(read("Blueprint.signedIn"), [GET, /anyone|public/i]));
  it("allowed to anyone and a role", () => refuses(read("Blueprint.anyone, grantee"), [GET, /anyone|public/i]));
});

describe("a name that would collide in the generated contract is refused", () => {
  for (const field of ["signer", "nonce", "deadline", "signature"]) {
    it(`a payload field named ${field}`, () => refusesWith(swap(CHAIN_BASE, `${V}/spend.ts`, "payload: { allowance: Allowance.fields.id,", `payload: { ${field}: Blueprint.money.of(Allowance.fields.token), allowance: Allowance.fields.id,`), ["signer", "nonce", "deadline", "signature"].filter((n) => n !== field).map(word), [SPEND, word(field), /payload|reserved|generated|collid|clash/i]));
  }
  const copyOfRevoke = (verb: string): Files => put(CHAIN_BASE, `${V}/${verb}.ts`, CHAIN_BASE[`${V}/revoke.ts`]!);
  const copyOfGet = (verb: string): Files => put(CHAIN_BASE, `${V}/${verb}.ts`, CHAIN_BASE[`${V}/get.ts`]!);
  for (const verb of ["nonces", "has-role", "eip712-domain", "grant-role", "revoke-role", "get-role-admin", "renounce-role"]) {
    it(`an operation named ${verb}`, () => refuses(copyOfRevoke(verb), [inFile(`blueprint/${V}/${verb}.ts`), /generated|entry|reserved|collid|clash/i]));
  }
  for (const verb of ["nonces", "has-role", "get-role-admin", "renounce-role"]) {
    it(`a read named ${verb}`, () => refuses(copyOfGet(verb), [inFile(`blueprint/${V}/${verb}.ts`), /generated|entry|reserved|collid|clash/i]));
  }
  it("an operation spend-by-sig beside spend, which has a spendBySig of its own", () => refuses(copyOfRevoke("spend-by-sig"), [inFile(`blueprint/${V}/spend-by-sig.ts`), /BySig/i], [SPEND, /BySig/i]));
});

describe("a chain-stored thing that declares an invariant is refused, naming the thing", () => {
  it("a unique rule on the allowance", () => {
    const rules = `import { Blueprint } from "orthograph";
import { Allowance } from "./thing.ts";
import { machine } from "./machine.ts";

export const onePerMember = Blueprint.invariant.unique(Allowance.fields.member, { while: [machine.states.active] });
`;
    refuses(put(CHAIN_BASE, "things/allowance/invariants.ts", rules), [word("allowance"), /invariant/i]);
  });
});

describe("controls: each case's change reached its file", () => {
  it("swap and put throw when what they replace is not there, so a stale fixture cannot refuse nothing", () => {
    expect(() => swap(CHAIN_BASE, `${V}/spend.ts`, "this text is not in the file", "x")).toThrow();
    expect(() => swap(CHAIN_BASE, "things/none.ts", "x", "y")).toThrow();
    expect(spendWith("idempotent: \"request\",")[`${V}/spend.ts`]).toContain('idempotent: "request"');
  });
});
