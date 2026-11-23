// What the slice 3 checks (`04-m6-10-*.test.ts`, M6.10: the chain store and values) share: small blueprints written into a project of their
// own outside the repository (as the compiler's own tests write theirs), the real `ortho` run on them, and the readers of what it says.
// Every reader is a pure function over text or JSON, so a check can plant a wrong input against it (the controls in each test file).
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect } from "vitest";
import { acme, copyOf, ortho } from "../layer1/support.ts";

export { acme, ortho };

/** A blueprint as files under `blueprint/`: path from there to text. `null` leaves a file of the base out. */
export type Files = Readonly<Record<string, string | null>>;

const CONFIG = `import { Blueprint } from "orthograph";\nexport default Blueprint.config({ name: "fixture" });\n`;

export interface Project { readonly root: string; readonly remove: () => void }

/** A project holding exactly these blueprint files, wired to the repository's packages (the example acme's node_modules, as every gate-1 check does). */
export const projectOf = (files: Files): Project => {
  const copy = copyOf(acme, ["package.json"]);
  writeFileSync(join(copy.root, "ortho.config.ts"), CONFIG);
  for (const [path, text] of Object.entries(files)) {
    if (text === null) continue;
    mkdirSync(dirname(join(copy.root, "blueprint", path)), { recursive: true });
    writeFileSync(join(copy.root, "blueprint", path), text);
  }
  return copy;
};

/** `files` with `from` replaced by `to` in one file. Throws when `from` is not there, so a fixture that drifts from its base fails loudly, never hollow. */
export const swap = (files: Files, file: string, from: string, to: string): Files => {
  const text = files[file];
  if (typeof text !== "string" || !text.includes(from)) throw new Error(`the fixture has no "${from}" in ${file}`);
  return { ...files, [file]: text.replace(from, to) };
};
/** `files` with one file set (or, with `null`, left out). */
export const put = (files: Files, file: string, text: string | null): Files => ({ ...files, [file]: text });

// ---- the chain base: the budgets blueprint's shape, written here so the example can change without moving the checks ----

export const CHAIN_BASE: Files = {
  "stores/budgets.ts": `import { Blueprint } from "orthograph";\nexport default Blueprint.store.chain.evm();\n`,
  "values/accounts.ts": `import { Blueprint } from "orthograph";\nexport const Recipient = Blueprint.value(Blueprint.account());\n`,
  "things/allowance/thing.ts": `import { Blueprint } from "orthograph";
import budgets from "../../stores/budgets.ts";

const token = Blueprint.account();

export const Allowance = Blueprint.thing({
  description: "Money a member may spend from a Safe, up to a limit.",
  fields: {
    id: Blueprint.id("alw"),
    safe: Blueprint.account(),
    member: Blueprint.account(),
    token,
    limit: Blueprint.money.of(token),
    spent: Blueprint.money.of(token),
  },
  lives: budgets,
});
`,
  "things/allowance/roles.ts": `import { Blueprint } from "orthograph";
import { Allowance } from "./thing.ts";

export const treasury = Blueprint.role(Allowance, { who: Allowance.fields.safe });
export const grantee = Blueprint.role(Allowance, { who: Allowance.fields.member });
`,
  "things/allowance/events.ts": `import { Blueprint } from "orthograph";
import { Allowance } from "./thing.ts";
import { Recipient } from "../../values/accounts.ts";

export const AllowanceGranted = Blueprint.event({
  allowance: Allowance.fields.id,
  safe: Allowance.fields.safe,
  member: Allowance.fields.member,
  token: Allowance.fields.token,
  limit: Blueprint.money.of(Allowance.fields.token),
});
export const AllowanceSpent = Blueprint.event({ allowance: Allowance.fields.id, amount: Blueprint.money.of(Allowance.fields.token), to: Recipient, remaining: Blueprint.money.of(Allowance.fields.token) });
export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id });
`,
  "things/allowance/machine.ts": `import { Blueprint } from "orthograph";
import { Allowance } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Allowance, {
  states: ["active", "exhausted", "revoked"],
  moves: {
    grant: { from: [], to: "active", emits: Events.AllowanceGranted },
    spend: { from: ["active"], to: ["active", "exhausted"], emits: Events.AllowanceSpent },
    revoke: { from: ["active", "exhausted"], to: "revoked", emits: Events.AllowanceRevoked },
  },
  notFrom: { exit: 40 },
});
`,
  "things/allowance/errors.ts": `import { Blueprint } from "orthograph";
import { Allowance } from "./thing.ts";

export class AllowanceExceeded extends Blueprint.error({ remaining: Blueprint.money.of(Allowance.fields.token) }, { exit: 41 }) {}
`,
  "things/allowance/verbs/get.ts": `import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";

export default Blueprint.read(Allowance, {
  by: "id",
  fields: ["safe", "member", "token", "limit", "spent", "state"],
  allowed: [Blueprint.anyone],
});
`,
  "things/allowance/verbs/grant.ts": `import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { machine } from "../machine.ts";
import { treasury } from "../roles.ts";

export default Blueprint.operation(Allowance, {
  description: "Let a member spend a token from the Safe, up to a limit.",
  payload: { safe: Allowance.fields.safe, member: Allowance.fields.member, token: Allowance.fields.token, limit: Allowance.fields.limit },
  answer: { allowance: Allowance.fields.id },
  move: machine.moves.grant,
  allowed: [treasury],
});
`,
  "things/allowance/verbs/revoke.ts": `import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { machine } from "../machine.ts";
import { treasury } from "../roles.ts";

export default Blueprint.operation(Allowance, {
  description: "Stop an allowance. Nothing more can be spent from it.",
  payload: { allowance: Allowance.fields.id },
  answer: {},
  move: machine.moves.revoke,
  allowed: [treasury],
});
`,
  "things/allowance/verbs/spend.ts": `import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { machine } from "../machine.ts";
import { grantee } from "../roles.ts";
import { AllowanceExceeded } from "../errors.ts";
import { Recipient } from "../../../values/accounts.ts";

export default Blueprint.operation(Allowance, {
  description: "Spend from what is left of the allowance: the Safe pays the token to the recipient.",
  payload: { allowance: Allowance.fields.id, amount: Blueprint.money.of(Allowance.fields.token), to: Recipient },
  answer: { remaining: Blueprint.money.of(Allowance.fields.token) },
  move: machine.moves.spend,
  errors: [AllowanceExceeded],
  allowed: [grantee],
});
`,
};

/**
 * A second thing in the same chain store, for what `allowance` alone cannot show: a field of every value kind and size, three states declared
 * out of alphabetical order (so their numbers must come from the declaration), and a role reached `.of(path)` from another thing's id.
 */
export const NOTE: Files = {
  "things/note/thing.ts": `import { Blueprint } from "orthograph";
import budgets from "../../stores/budgets.ts";
import { Allowance } from "../allowance/thing.ts";

export const Note = Blueprint.thing({
  description: "A note left on an allowance.",
  fields: {
    id: Blueprint.id("nte"),
    allowance: Allowance.fields.id,
    n8: Blueprint.uint(8),
    n16: Blueprint.uint(16),
    n32: Blueprint.uint(32),
    n64: Blueprint.uint(64),
    n256: Blueprint.uint(256),
    body: Blueprint.text({ max: 40 }),
    by: Blueprint.account(),
  },
  lives: budgets,
});
`,
  "things/note/events.ts": `import { Blueprint } from "orthograph";
import { Note } from "./thing.ts";

export const NoteWritten = Blueprint.event({ note: Note.fields.id, body: Note.fields.body });
export const NotePassed = Blueprint.event({ note: Note.fields.id });
export const NoteSettled = Blueprint.event({ note: Note.fields.id });
`,
  "things/note/machine.ts": `import { Blueprint } from "orthograph";
import { Note } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Note, {
  states: ["zeta", "alpha", "mid"],
  moves: {
    write: { from: [], to: "zeta", emits: Events.NoteWritten },
    pass: { from: ["zeta"], to: "alpha", emits: Events.NotePassed },
    settle: { from: ["alpha"], to: "mid", emits: Events.NoteSettled },
  },
  notFrom: { exit: 50 },
});
`,
  "things/note/verbs/write.ts": `import { Blueprint } from "orthograph";
import { Note } from "../thing.ts";
import { machine } from "../machine.ts";
import { grantee } from "../../allowance/roles.ts";

export default Blueprint.operation(Note, {
  description: "Leave a note on an allowance, as its member.",
  payload: { allowance: Note.fields.allowance, body: Note.fields.body },
  answer: { note: Note.fields.id },
  move: machine.moves.write,
  allowed: [grantee.of("allowance")],
});
`,
};

/** The assets a blueprint may name: a fixed token and a currency, as files under `blueprint/assets/` (M6-money item 2). */
export const ASSETS: Files = {
  "assets/usdc.ts": `import { Blueprint } from "orthograph";\nexport default Blueprint.asset.token({ symbol: "USDC", decimals: 6 });\n`,
  "assets/eur.ts": `import { Blueprint } from "orthograph";\nexport default Blueprint.asset.currency("EUR");\n`,
};

// ---- a plain database project: the lock's fixtures, which need no chain ----

export const DB_BASE: Files = {
  "values/amounts.ts": `import { Blueprint } from "orthograph";\nexport const Cap = Blueprint.value(Blueprint.uint(64));\n`,
  "things/ticket/thing.ts": `import { Blueprint } from "orthograph";
import { Cap } from "../../values/amounts.ts";

export const Ticket = Blueprint.thing({
  description: "A piece of work someone asked for.",
  code: "TK",
  fields: { id: Blueprint.id("tkt"), title: Blueprint.text({ max: 80 }), cap: Cap },
});
`,
  "things/ticket/events.ts": `import { Blueprint } from "orthograph";
import { Ticket } from "./thing.ts";

export const TicketOpened = Blueprint.event({ ticket: Ticket.fields.id });
export const TicketClosed = Blueprint.event({ ticket: Ticket.fields.id });
`,
  "things/ticket/machine.ts": `import { Blueprint } from "orthograph";
import { Ticket } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Ticket, {
  states: ["open", "closed"],
  moves: {
    open: { from: [], to: "open", emits: Events.TicketOpened },
    close: { from: ["open"], to: "closed", emits: Events.TicketClosed },
  },
  notFrom: { exit: 60 },
});
`,
  "things/ticket/errors.ts": `import { Blueprint } from "orthograph";
import { Cap } from "../../values/amounts.ts";

export class TicketTooBig extends Blueprint.error({ cap: Cap }, { exit: 10 }) {}
export class TicketBusy extends Blueprint.error({}, { exit: 11 }) {}
`,
  "things/ticket/verbs/open.ts": `import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { machine } from "../machine.ts";
import { TicketTooBig, TicketBusy } from "../errors.ts";

export default Blueprint.operation(Ticket, {
  description: "Open a ticket.",
  payload: { title: Ticket.fields.title, cap: Ticket.fields.cap },
  answer: { ticket: Ticket.fields.id },
  move: machine.moves.open,
  errors: [TicketTooBig, TicketBusy],
  allowed: [Blueprint.anyone],
  steps: { save: Blueprint.step.database() },
});
`,
  "things/ticket/verbs/close.ts": `import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Ticket, {
  description: "Close a ticket.",
  payload: { ticket: Ticket.fields.id },
  answer: {},
  move: machine.moves.close,
  allowed: [Blueprint.anyone],
  steps: { save: Blueprint.step.database() },
});
`,
};

// ---- running ortho ----

export interface Ran { readonly status: number | null; readonly out: string; readonly err: string }
export const run = (root: string, ...args: ReadonlyArray<string>): Ran => {
  const r = ortho(root, ...args);
  return { status: r.status, out: r.stdout, err: r.stderr };
};

/** The model JSON of a project that compiles, or `undefined` with the run that says why not. */
export const modelOf = (root: string): { readonly model?: AnyModel; readonly ran: Ran } => {
  const ran = run(root, "model", "--json");
  if (ran.status !== 0) return { ran };
  return { model: JSON.parse(ran.out) as AnyModel, ran };
};

/** The parts of the model these checks read, loosely typed: each check says which keys it needs. */
export interface AnyModel {
  readonly refusals: Readonly<Record<string, string>>;
  readonly values: Readonly<Record<string, Record<string, unknown>>>;
  readonly stores?: Readonly<Record<string, { readonly kind: string; readonly file?: string }>>;
  readonly things: Readonly<Record<string, AnyThing>>;
  readonly operations: Readonly<Record<string, AnyOperation>>;
}
export interface AnyThing {
  readonly fields: Readonly<Record<string, { readonly value: Record<string, unknown>; readonly solidity?: unknown }>>;
  readonly machine: { readonly states: ReadonlyArray<string> } | null;
  readonly stateNumbers?: unknown;
  readonly lives?: string;
  readonly store?: string;
  readonly [k: string]: unknown;
}
export interface AnyOperation { readonly runs?: string; readonly allowed: ReadonlyArray<Record<string, unknown>>; readonly refusals: ReadonlyArray<string>; readonly [k: string]: unknown }

export const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

// ---- what a refusal must say ----

/** What one case of refusal must say: the lines of the output that hold each of these (the file, the name, a word of what is wrong), in any order. */
export type Needs = ReadonlyArray<RegExp>;

/**
 * The lines of a failed command that are the refusal of one case: a line holding every `needs` pattern of one of the alternatives (the
 * blueprint file, the thing, operation or field it is about, and a word of what is wrong). The loader's failure today ("can't load ...: TypeError:
 * Cannot read properties of undefined") holds the file but none of the others, so it never counts: a line has to say the case.
 */
export const refusalLines = (text: string, ...alternatives: ReadonlyArray<Needs>): ReadonlyArray<string> =>
  text.split("\n").filter((l) => alternatives.some((needs) => needs.every((n) => n.test(l))));

/** The pattern for a file path as the compiler prints it, whole: `blueprint/things/allowance/thing.ts`. */
export const inFile = (path: string): RegExp => new RegExp(`(?<![A-Za-z0-9_./-])${path.replace(/[.]/g, "\\.").replace(/\//g, "\\/")}(?![A-Za-z0-9_.-])`);
/** The pattern for a name as a word, so `spend` is not found in `spendBySig`. */
export const word = (name: string): RegExp => new RegExp(`(?<![A-Za-z0-9_-])${name.replace(/[.]/g, "\\.")}(?![A-Za-z0-9_-])`);

/**
 * A blueprint the compiler must refuse, in both of the user's ways in: `ortho model` exits 2 with the problems on stderr and nothing on
 * stdout, and `ortho check` exits 1 and prints them under `model ✘`. In each, a line must say the case (`refusalLines`).
 */
export const refuses = (files: Files, ...alternatives: ReadonlyArray<Needs>): void => refusesWith(files, [], ...alternatives);

/**
 * `refuses`, and the line that says the case must not also say any of `foreign` (the words of the other cases): one line that names every forbidden thing
 * at once would pass every case, so a refusal has to be of this case, in at least one line of each output.
 */
export const refusesWith = (files: Files, foreign: ReadonlyArray<RegExp>, ...alternatives: ReadonlyArray<Needs>): void => {
  const p = projectOf(files);
  const own = (lines: ReadonlyArray<string>) => lines.filter((l) => !foreign.some((f) => f.test(l)));
  try {
    const m = run(p.root, "model", "--json");
    expect(m.status, `ortho model should refuse; it said:\n${m.out.slice(0, 400)}${m.err.slice(0, 1500)}`).toBe(2);
    expect(m.out).toBe("");
    expect(own(refusalLines(m.err, ...alternatives)), `no line of ortho model's problems says it (and only it):\n${m.err.slice(0, 2500)}`).not.toEqual([]);
    const c = run(p.root, "check");
    expect(c.status, `ortho check should fail; it said:\n${c.out.slice(0, 1500)}`).toBe(1);
    expect(c.out).toContain("model ✘");
    expect(own(refusalLines(c.out, ...alternatives)), `no line of ortho check's output says it (and only it):\n${c.out.slice(0, 2500)}`).not.toEqual([]);
  } finally { p.remove(); }
};

/** A blueprint the compiler must take: `ortho model --json` exits 0. Returns the model. */
export const compiles = (files: Files): AnyModel => {
  const p = projectOf(files);
  try {
    const { model, ran } = modelOf(p.root);
    expect(ran.status, `ortho model should compile it; it said:\n${ran.err.slice(0, 2500)}`).toBe(0);
    return model!;
  } finally { p.remove(); }
};

// ---- keccak256, for the selectors of the lock's Solidity wire identities (no dependency: the e2e package has none for it) ----

const RC = [0x1n, 0x8082n, 0x800000000000808an, 0x8000000080008000n, 0x808bn, 0x80000001n, 0x8000000080008081n, 0x8000000000008009n, 0x8an, 0x88n, 0x80008009n, 0x8000000an, 0x8000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n, 0x800an, 0x800000008000000an, 0x8000000080008081n, 0x8000000000008080n, 0x80000001n, 0x8000000080008008n];
const ROT = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44];
const PI = [10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1];
const M64 = (1n << 64n) - 1n;
const rotl = (x: bigint, n: number) => ((x << BigInt(n)) | (x >> BigInt(64 - n))) & M64;
const permute = (s: bigint[]) => {
  for (let round = 0; round < 24; round++) {
    const c = [0, 1, 2, 3, 4].map((x) => s[x]! ^ s[x + 5]! ^ s[x + 10]! ^ s[x + 15]! ^ s[x + 20]!);
    for (let x = 0; x < 5; x++) { const d = c[(x + 4) % 5]! ^ rotl(c[(x + 1) % 5]!, 1); for (let y = 0; y < 25; y += 5) s[y + x] = s[y + x]! ^ d; }
    let cur = s[1]!;
    for (let i = 0; i < 24; i++) { const j = PI[i]!; const next = s[j]!; s[j] = rotl(cur, ROT[i]!); cur = next; }
    for (let y = 0; y < 25; y += 5) { const row = s.slice(y, y + 5); for (let x = 0; x < 5; x++) s[y + x] = row[x]! ^ (~row[(x + 1) % 5]! & M64 & row[(x + 2) % 5]!); }
    s[0] = s[0]! ^ RC[round]!;
  }
};
/** keccak-256 (the pre-NIST padding Ethereum uses) of text, as hex without `0x`. */
export const keccak256 = (text: string): string => keccak256Bytes(new TextEncoder().encode(text));
/** keccak-256 of bytes, as hex without `0x`. */
export const keccak256Bytes = (input: Uint8Array): string => {
  const rate = 136;
  const bytes = [...input];
  bytes.push(0x01);
  while (bytes.length % rate !== 0) bytes.push(0);
  bytes[bytes.length - 1]! |= 0x80;
  const s: bigint[] = Array.from({ length: 25 }, () => 0n);
  for (let off = 0; off < bytes.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) { let lane = 0n; for (let b = 7; b >= 0; b--) lane = (lane << 8n) | BigInt(bytes[off + i * 8 + b]!); s[i] = s[i]! ^ lane; }
    permute(s);
  }
  let out = "";
  for (let i = 0; i < 4; i++) for (let b = 0; b < 8; b++) out += Number((s[i]! >> BigInt(8 * b)) & 0xffn).toString(16).padStart(2, "0");
  return out;
};
/** The 4-byte selector of a Solidity signature, `0x` and 8 hex digits. */
export const selectorOf = (signature: string): string => `0x${keccak256(signature).slice(0, 8)}`;
