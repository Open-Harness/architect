// What an operation of a chain-stored thing may and may not declare (M6-chain items 1, 5, 7 and 8).
import type { Allowed, Operation, Read, Role } from "orthograph";
import type { FieldsModel } from "../types.ts";
import { canonical } from "./hash.ts";

/** The payload names the generated signed entry takes for itself. */
const RESERVED_FIELDS: ReadonlyArray<string> = ["signer", "nonce", "deadline", "signature"];

/** The entries the generated contract has of its own: a verb named like one would be declared twice. */
export const RESERVED_ENTRIES: ReadonlyArray<string> = ["nonces", "eip712Domain", "hasRole", "getRoleAdmin", "grantRole", "revokeRole", "renounceRole"];

export interface ChainOperation {
  readonly file: string;
  readonly name: string;
  readonly thing: string;
  readonly op: Operation;
  readonly roleNames: ReadonlyMap<Role, string>;
  readonly payload: FieldsModel;
  readonly answer: FieldsModel;
  /** The fields of the event its move emits. */
  readonly event: FieldsModel | undefined;
  readonly emits: string;
  /** The payload or answer field that carries the new row's id, for a creating move. */
  readonly mints: string | undefined;
}

const roleOf = (a: Allowed): Role | undefined => (a.kind === "role" ? a : a.kind === "role-of" ? a.role : undefined);

/** A step the generated contract can't take: it reaches only its own store and the account adapter (item 8). */
const FOREIGN_STEPS = ["database", "actor"];

export const chainOperationProblems = ({ file, name, thing, op, roleNames, payload, answer, event, emits, mints }: ChainOperation): ReadonlyArray<string> => {
  const problems: Array<string> = [];
  const said = `${file}: ${name}`;
  if (op.runsDeclared !== undefined) problems.push(`${said} writes runs: "${op.runsDeclared}", which an author never writes: it runs on the chain because ${thing} lives in a chain store`);
  if (op.idempotent !== undefined) problems.push(`${said} declares idempotent, but the nonce makes every call land at most once on chain: leave it out`);
  if ("signedBy" in op) problems.push(`${said} writes signedBy, which no one writes any more: the role that allows the operation is who must sign (M6-chain item 1)`);
  for (const [key, step] of Object.entries(op.steps)) {
    if (FOREIGN_STEPS.includes(step.type)) problems.push(`${said} declares the ${step.type} step ${key}: an operation of a chain-stored thing reaches only its own store and the account adapter, so it has no ${step.type} step`);
  }
  for (const a of op.allowed) {
    if (a.kind === "signed-in") problems.push(`${said} is allowed to Blueprint.signedIn: every caller on chain has signed, so allow a who role or Blueprint.anyone`);
    const role = roleOf(a);
    if (role === undefined) continue;
    const named = roleNames.get(role) ?? "a role";
    if (role.who === undefined) problems.push(`${said} is allowed to the role ${named}, whose rule is TypeScript only: a contract can't run it, so use a who role on an account() field`);
    else if (role.who.value.meta.type !== "account") problems.push(`${said} is allowed to the who role ${named} on ${role.who.key}, which is no account(): on a chain store a who role is the account that signed`);
    else if (a.kind === "role" && op.move?.from.length === 0 && role.thing === op.thing && !(role.who.key in payload)) {
      problems.push(`${said} creates a row and is allowed to ${named}, which is decided on the payload's ${role.who.key}, but the payload has no ${role.who.key}`);
    }
  }
  // A move that makes the row counts, in each amount, the token its payload carries: there is no stored row to read it from yet (M6-money item 1).
  if (op.move?.from.length === 0) {
    for (const [key, f] of Object.entries(payload)) {
      if (f.value.type === "money" && "field" in f.value.asset && !(f.value.asset.field in payload)) {
        problems.push(`${said}'s payload field ${key} is an amount of the asset in ${f.value.asset.field}, and the operation makes the row, so its payload must carry ${f.value.asset.field} too`);
      }
    }
  }
  for (const key of RESERVED_FIELDS.filter((k) => k in payload)) {
    problems.push(`${said}'s payload field ${key} collides with the generated contract, which adds a ${key} of its own to every entry: rename it`);
  }
  for (const [key, field] of Object.entries(answer)) {
    const read = event?.[key];
    const fromEvent = read !== undefined && canonical(read.value) === canonical(field.value);
    if (!fromEvent && key !== mints) {
      problems.push(`${said}'s answer field ${key} is neither a field of its event ${emits} nor the new row's id: a call on chain lands later, so its answer is read from the event`);
    }
  }
  return problems;
};

/** A read of a chain-stored thing is a public `view`: only `Blueprint.anyone` may be allowed, and only a read by id is one. */
export const chainReadProblems = (file: string, name: string, read: Read): ReadonlyArray<string> => [
  ...(read.allowed.length === 1 && read.allowed[0]?.kind === "anyone" ? [] : [`${file}: ${name} is a read of a chain-stored thing, which a public chain shows to everyone: allowed must be [Blueprint.anyone], not a role or signedIn`]),
  ...(read.by === "list" ? [`${file}: ${name} is a list read of a chain-stored thing: a contract has no list to read, so a read is by id`] : []),
];

/** Verbs of one chain store whose entry name collides: with an entry the generated contract has, or with another operation's signed entry. */
export const collisionProblems = (verbs: ReadonlyArray<{ readonly file: string; readonly name: string; readonly identifier: string }>): ReadonlyArray<string> => {
  const identifiers = new Set(verbs.map((v) => v.identifier));
  return verbs.flatMap((v) => [
    ...(RESERVED_ENTRIES.includes(v.identifier) ? [`${v.file}: ${v.name} is named like ${v.identifier}, an entry the generated contract has of its own: rename it`] : []),
    ...(v.identifier.endsWith("BySig") && identifiers.has(v.identifier.slice(0, -"BySig".length)) ? [`${v.file}: ${v.name} is named like ${v.identifier}, the signed entry the generated contract gives ${v.identifier.slice(0, -"BySig".length)}: rename it`] : []),
  ]);
};
