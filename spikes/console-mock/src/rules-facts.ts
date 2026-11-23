// Plugged In's own facts for the ST1.22 screens. Nothing here is invented: each block names the file it was read from.
// A fact the wire does not carry is a gap, listed in the README's ST1.22 section, never filled in here.

/** examples/plugged-in/blueprint/things/{handle,profile}/invariants.ts, read through generated/portal/blueprint.json (`things.<t>.invariants`).
 *  The sentence is the one generated/docs/handle/index.md and generated/docs/profile/index.md print; a rule with a `description` shows that instead. */
export type Rule = {
  thing: string; name: string; fields: string[]; while: string[]; refuse: string | null; described: boolean; sentence: string;
};
export const rules: Rule[] = [
  { thing: "handle", name: "oneHolderPerName", fields: ["name"], while: ["claimed"], refuse: "HandleTaken", described: false, sentence: "another claimed handle holds this name" },
  { thing: "handle", name: "oneNamePerPerson", fields: ["owner"], while: ["claimed"], refuse: "HandleAlreadyOwned", described: true, sentence: "you already hold a name" },
  { thing: "profile", name: "onePagePerHandle", fields: ["handle"], while: [], refuse: null, described: false, sentence: "another profile holds this handle" },
];

/** examples/plugged-in/generated/api/src/errors.ts (`refusals`: code, exit, status). `rule` is the wire's `operations.<op>.invariants`; HandleNotClaimed is
 *  `things.handle.machine.notFrom`. */
export type Refusal = { name: string; code: string; exit: number; status: number; rule?: string };
export const refusals: Record<string, Refusal> = {
  HandleTaken: { name: "HandleTaken", code: "HN-001", exit: 10, status: 422, rule: "handle.oneHolderPerName" },
  HandleAlreadyOwned: { name: "HandleAlreadyOwned", code: "HN-002", exit: 12, status: 422, rule: "handle.oneNamePerPerson" },
  HandleNotFound: { name: "HandleNotFound", code: "HN-003", exit: 13, status: 404 },
  HandleNotClaimed: { name: "HandleNotClaimed", code: "HN-900", exit: 11, status: 409 },
  ProfileNotFound: { name: "ProfileNotFound", code: "PR-001", exit: 20, status: 404 },
  NotAllowed: { name: "NotAllowed", code: "AR-001", exit: 3, status: 403 },
  IdempotencyConflict: { name: "IdempotencyConflict", code: "AR-002", exit: 120, status: 409 },
};

export const ruleOf = (name: string) => rules.find((r) => `${r.thing}.${r.name}` === refusals[name]?.rule);

/** generated/docs/handle/{claim,release}.md, "Refusals" table, "when" column. */
export const when: Record<string, string> = {
  HandleNotClaimed: "the handle is in a state release can't start from; carries `state`",
  NotAllowed: "the caller isn't anyone signed in; the handler never runs",
  IdempotencyConflict: "the request key was first used with another payload; the handler never runs",
};
