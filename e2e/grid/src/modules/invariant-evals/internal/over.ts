import type { CellId, Eval } from "../../grid/types.ts";
import type { OperationModel, ProjectEvidence, RuleModel, ThingModel } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";

/** One rule, as the model has it, with the operations the model says can break it (the ones whose `invariants` map a refusal to it). */
export interface Found {
  readonly full: string;
  readonly local: string;
  readonly thing: ThingModel;
  readonly rule: RuleModel;
  readonly breakers: ReadonlyArray<OperationModel>;
}

/** `<thing>.<rule>`: the thing is everything before the first dot. */
export const ruleOf = (e: ProjectEvidence, subject: string): Found | undefined => {
  const at = subject.indexOf(".");
  const thing = at < 0 ? undefined : e.model.things[subject.slice(0, at)];
  const local = subject.slice(at + 1);
  const rule = thing?.invariants?.[local];
  if (thing === undefined || rule === undefined) return undefined;
  const breakers = Object.values(e.model.operations).filter((op) => rule.refuse !== undefined && op.invariants?.[rule.refuse] === subject);
  return { full: subject, local, thing, rule, breakers };
};

export const over = (cell: CellId, problems: (found: Found, evidence: ProjectEvidence, subject: string) => ReadonlyArray<string>): Eval<ProjectEvidence> =>
  Reading.over(cell, "rule", ruleOf, problems);

/** The names a rule's own sentence must carry, from the model: its thing, each key field and each state it holds in. The words around them are the generator's. */
export const carried = (f: Found): ReadonlyArray<string> => [f.thing.name, ...f.rule.fields, ...(f.rule.while ?? [])];

/** A declared name as a sentence says it: kebab, snake and camel case as spaced lower case (`sign-in` and `personId` are "sign in" and "person id"). */
export const spaced = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").toLowerCase();

/** Every other rule of the model: a generated sentence may not be one of their descriptions. */
const others = (e: ProjectEvidence, f: Found) => Object.values(e.model.things).flatMap((t) => Object.entries(t.invariants ?? {}).map(([n, r]) => ({ full: `${t.name}.${n}`, rule: r }))).filter((o) => o.full !== f.full);

/**
 * Is `text` the rule's sentence: its own `description` verbatim when it has one (a written description replaces the generated sentence everywhere), and
 * otherwise a sentence that names its thing, every key field and every state, and is no other rule's description. The problems, empty when it is.
 */
export const sentenceProblems = (e: ProjectEvidence, f: Found, text: string, where: string): ReadonlyArray<string> => {
  const said = text.trim().replace(/\.$/, "");
  if (f.rule.description !== undefined) return said === f.rule.description.replace(/\.$/, "") ? [] : [`${where} says "${said}", the rule's description is "${f.rule.description}": a written description replaces the generated sentence`];
  const missing = carried(f).filter((w) => !Reading.hasName(said.toLowerCase(), spaced(w)));
  return [
    ...(said === "" ? [`${where} has no sentence for the rule`] : []),
    ...(said !== "" && missing.length > 0 ? [`${where}'s sentence "${said}" does not name ${missing.join(", ")}`] : []),
    ...others(e, f).filter((o) => o.rule.description !== undefined && said === o.rule.description.replace(/\.$/, "")).map((o) => `${where}'s sentence is ${o.full}'s description`),
  ];
};

/** The error classes an endpoint lists in `error: [A, B]`, read from its code with comments off. */
export const listedErrors = (source: string): string => /\berror:\s*\[([^\]]*)\]/.exec(Reading.code(source))?.[1] ?? "";
