// Goal 4, slice 3 (M6.10), fifth check: the `who` roles (K20's form) on an account field (`design/decisions/M6-chain.md` item 5; K20,
// `design/decisions/K20-roles-across-things.md`). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. With the real `ortho model --json` on the budgets shape (`export const treasury = Blueprint.role(Allowance, { who: Allowance.fields.safe })`,
// `grantee` the same for `member`):
//   - a `who` role on an `account()` field compiles; the model lists the roles of the thing and the operation's `allowed` names them as before
//     (`{ kind: "role", role: "allowance.grantee" }`); and the model records the role as declared, a `who` naming its field, under the role's own name in
//     the thing's `roles` or `roleRules` (K20: `{ kind: "who", who: "member" }`), so every language can render it;
//   - a creating move (`from: []`) allowed to a `who` role of its own thing is decided on the payload's field of the same name, the row about to be made: `grant`
//     is allowed to `treasury` and its payload carries `safe`. A creating move whose payload has no such field is refused, naming the operation and the field;
//   - a role reached `.of(path)` from another thing's payload (`grantee.of("allowance")`, on a `note` that names its allowance) compiles, and the model keeps
//     the path (`{ kind: "role-of", role: "allowance.grantee", path: "allowance" }`);
//   - a `who` role on a field that is not an account on a chain-stored thing (the amount, the id) is refused when an operation allows it, naming the role.
//
// WHERE THE SHAPE IS MINE. K20 draws the model of a `who` role (`kind`, `who`) but the model today keeps roles as a list and their rules as text; the role's record
// may sit in `roles` (a map keyed by role) or in `roleRules` (replacing the text for a `who` role): the check finds it in either, by the role's name. This is in
// "Questions for the lead". A `who` on a database thing (a person's id, M2.18's runtime) is not judged here: it needs the Effect runtime, and is the next slice's.
//
// THE CONTROLS plant wrong records against `whoOf`: the wrong field, the wrong kind, a rule's text where a record belongs, and the role missing.
import { describe, expect, it } from "vitest";
import { CHAIN_BASE, NOTE, compiles, inFile, put, refuses, swap, word, type Files } from "./chain-fixture.ts";

/** The declared form of a role in a thing's model: an object with `kind: "who"` and the field's key, found under the role's name in `roles` or `roleRules`. */
const whoOf = (thing: Record<string, unknown>, role: string): { kind?: unknown; who?: unknown } | undefined => {
  for (const place of ["roles", "roleRules"]) {
    const here = thing[place];
    const found = typeof here === "object" && here !== null && !Array.isArray(here) ? (here as Record<string, unknown>)[role] : undefined;
    if (typeof found === "object" && found !== null) return found as { kind?: unknown; who?: unknown };
  }
  return undefined;
};
/** Whether the thing's `roles` lists the role: a list of names, or a map keyed by them. */
const listsRole = (thing: Record<string, unknown>, role: string): boolean => {
  const roles = thing["roles"];
  return Array.isArray(roles) ? roles.includes(role) : typeof roles === "object" && roles !== null && role in roles;
};

describe("controls: whoOf and listsRole refuse each hollow record", () => {
  const thing = (roles: unknown, roleRules: unknown) => ({ roles, roleRules }) as Record<string, unknown>;
  it("finds the declared form in roles or in roleRules", () => {
    expect(whoOf(thing({ grantee: { kind: "who", who: "member" } }, {}), "grantee")).toEqual({ kind: "who", who: "member" });
    expect(whoOf(thing(["grantee"], { grantee: { kind: "who", who: "member" } }), "grantee")).toEqual({ kind: "who", who: "member" });
  });
  it("finds nothing for a rule's text, a missing role, or a role listed by name only", () => {
    expect(whoOf(thing(["grantee"], { grantee: "(a, p) => a.member === p.person" }), "grantee")).toBeUndefined();
    expect(whoOf(thing(["treasury"], { grantee: null }), "grantee")).toBeUndefined();
    expect(whoOf(thing(["grantee"], {}), "grantee")).toBeUndefined();
  });
  it("lists a role by a list or a map, and not when it is absent", () => {
    expect(listsRole(thing(["grantee"], {}), "grantee")).toBe(true);
    expect(listsRole(thing({ grantee: {} }, {}), "grantee")).toBe(true);
    expect(listsRole(thing(["treasury"], {}), "grantee")).toBe(false);
    expect(listsRole(thing(undefined, {}), "grantee")).toBe(false);
  });
});

describe("a who role on an account field compiles and is recorded as declared", () => {
  it("treasury (who: safe) and grantee (who: member): listed, recorded with their fields, and named by the operations that allow them", () => {
    const m = compiles(CHAIN_BASE);
    const t = m.things["allowance"] as unknown as Record<string, unknown>;
    expect(listsRole(t, "treasury")).toBe(true);
    expect(listsRole(t, "grantee")).toBe(true);
    expect(whoOf(t, "treasury")).toMatchObject({ kind: "who", who: "safe" });
    expect(whoOf(t, "grantee")).toMatchObject({ kind: "who", who: "member" });
    expect(m.operations["allowance.spend"]?.allowed).toEqual([{ kind: "role", role: "allowance.grantee" }]);
    expect(m.operations["allowance.revoke"]?.allowed).toEqual([{ kind: "role", role: "allowance.treasury" }]);
  });
  it("the role's field is the thing's own: a who on another field is recorded with that field", () => {
    const m = compiles(put(CHAIN_BASE, "things/allowance/roles.ts", CHAIN_BASE["things/allowance/roles.ts"]!.replace("who: Allowance.fields.member", "who: Allowance.fields.token")));
    expect(whoOf(m.things["allowance"] as unknown as Record<string, unknown>, "grantee")).toMatchObject({ kind: "who", who: "token" });
  });
});

describe("a creating move is decided on the payload's field of the same name", () => {
  it("grant, allowed to treasury, carries safe in its payload, and compiles", () => {
    const m = compiles(CHAIN_BASE);
    expect(m.operations["allowance.grant"]?.allowed).toEqual([{ kind: "role", role: "allowance.treasury" }]);
    expect(Object.keys(m.operations["allowance.grant"]?.["payload"] as object)).toContain("safe");
  });
  it("a grant whose payload has no safe cannot be decided, and is refused naming the operation and the field", () => {
    const files = swap(CHAIN_BASE, "things/allowance/verbs/grant.ts", "payload: { safe: Allowance.fields.safe, member:", "payload: { member:");
    refuses(files, [inFile("blueprint/things/allowance/verbs/grant.ts"), word("safe")]);
  });
});

describe("a role reached .of(path) from another thing's payload compiles and keeps its path", () => {
  it("note.write, allowed to grantee.of(\"allowance\")", () => {
    const m = compiles({ ...CHAIN_BASE, ...NOTE });
    expect(m.operations["note.write"]?.allowed).toEqual([{ kind: "role-of", role: "allowance.grantee", path: "allowance" }]);
  });
});

describe("a who role on a field that is no account, on a chain store, is refused when an operation allows it", () => {
  const roleOn = (field: string): Files => {
    const files = put(CHAIN_BASE, "things/allowance/roles.ts", `${CHAIN_BASE["things/allowance/roles.ts"]}export const sized = Blueprint.role(Allowance, { who: Allowance.fields.${field} });\n`);
    return swap(swap(files, "things/allowance/verbs/spend.ts", "  allowed: [grantee],\n", "  allowed: [sized],\n"), "things/allowance/verbs/spend.ts", 'import { grantee } from "../roles.ts";', 'import { sized } from "../roles.ts";');
  };
  for (const field of ["limit", "id"]) {
    it(`who: the ${field}`, () => refuses(roleOn(field), [inFile("blueprint/things/allowance/verbs/spend.ts"), word("sized"), /account|who/i], [inFile("blueprint/things/allowance/roles.ts"), word("sized"), /account|who/i]));
  }
});
