import type { Eval } from "../../grid/types.ts";
import type { JourneyModel, ProjectEvidence } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";

type Cell = "error.model" | "error.api" | "error.server" | "error.sdk";
/** What the model says of one refusal: its code, its exit when it declares one, and the operations that can give it. */
interface Fact { readonly name: string; readonly code: string | undefined; readonly exit: number | undefined; readonly operations: ReadonlyArray<string> }

const fact = (e: ProjectEvidence, name: string): Fact | undefined => {
  const things = Object.values(e.model.things);
  const declared = things.map((t) => t.errors?.[name]).find((x) => x !== undefined);
  const machine = things.map((t) => t.machine?.notFrom).find((n) => n?.error === name);
  const missed = things.map((t) => t.notFound).find((n) => n?.error === name);
  const operations = Object.values(e.model.operations).filter((op) => (op.refusals ?? []).includes(name)).map((op) => op.name);
  const code = e.model.refusals[name] ?? declared?.code ?? machine?.code ?? missed?.code;
  return code === undefined && operations.length === 0 ? undefined : { name, code, exit: declared?.exit ?? machine?.exit ?? missed?.exit, operations };
};

const over = (cell: Cell, problems: (fact: Fact, evidence: ProjectEvidence) => ReadonlyArray<string>): Eval<ProjectEvidence> =>
  Reading.over(cell, "refusal", fact, problems);

/** The error classes an endpoint lists in `error: [A, B]`, read from its code with comments off. */
const listedErrors = (source: string) => /\berror:\s*\[([^\]]*)\]/.exec(Reading.code(source))?.[1] ?? "";

/** error.model: the refusal has a code (two letters, a dash, three digits, unique in the model), an exit when declared, and some operation that gives it. */
export const model = over("error.model", (f, e) => [
  ...(f.code === undefined ? ["the model has no code for it"] : /^[A-Z]{2}-\d{3}$/.test(f.code) ? [] : [`its code ${f.code} is not two letters, a dash and three digits`]),
  ...(f.code === undefined ? [] : Object.entries(e.model.refusals).filter(([n, c]) => c === f.code && n !== f.name).map(([n]) => `its code ${f.code} is also ${n}'s`)),
  ...(f.operations.length === 0 ? ["no operation in the model gives it"] : []),
  ...(f.exit !== undefined && (!Number.isInteger(f.exit) || f.exit < 1 || f.exit > 255) ? [`its exit ${f.exit} is not a process exit status`] : []),
]);

/** error.api: the generated errors file has the typed class with the model's code, a table row with the code (and exit, when the model has one), and each giving operation's endpoint lists it. */
export const api = over("error.api", (f, e) => {
  const errors = e.files["generated/api/src/errors.ts"];
  if (errors === undefined) return ["generated/api/src/errors.ts was not generated"];
  const row = Reading.objectRows(errors, "refusals")?.[f.name];
  const cls = Reading.classText(errors, f.name);
  return [
    ...(cls === undefined ? [`errors.ts has no class ${f.name}`] : cls.includes(`Schema.Literal(refusals.${f.name}.code)`) ? [] : [`${f.name}'s class does not carry its code as a literal`]),
    ...(row === undefined ? [`errors.ts's refusals table has no row for ${f.name}`] : [
      ...(row["code"] === f.code ? [] : [`the table says ${String(row["code"])}, the model says ${f.code ?? "no code"}`]),
      ...(f.exit === undefined || row["exit"] === f.exit ? [] : [`the table's exit is ${String(row["exit"])}, the model's is ${f.exit}`]),
    ]),
    ...f.operations.flatMap((name) => {
      const op = e.model.operations[name]!;
      return Reading.hasName(listedErrors(e.files[`generated/api/src/${op.thing}/${op.verb}.ts`] ?? ""), f.name) ? [] : [`${name}'s endpoint does not list ${f.name}`];
    }),
  ];
});

/** A journey step's `refuses` check names a declared error, or a thing's own as `<thing>.notFrom` / `<thing>.notFound`. */
const refusedBy = (e: ProjectEvidence, journey: JourneyModel, name: string) => journey.steps.filter((s) => (s.checks ?? []).some((c) => {
  const error = (c as { readonly kind: string; readonly error?: string }).error;
  if (c.kind !== "refuses" || error === undefined) return false;
  const [thing, rest] = error.split(".");
  return error === name || (rest === "notFrom" && e.model.things[thing!]?.machine?.notFrom.error === name) || (rest === "notFound" && e.model.things[thing!]?.notFound?.error === name);
}));

/** error.server: a journey step expects the refusal, and prove saw every such step pass: the server gave it, typed with its code. */
export const server = over("error.server", (f, e) => {
  if (e.prove === undefined) return ["no prove run was read"];
  const steps = Object.values(e.model.journeys ?? {}).flatMap((j) => refusedBy(e, j, f.name).map((s) => ({ journey: j.name, title: s.title })));
  if (steps.length === 0) return [`no journey step expects ${f.name}, so the server was never seen to give it`];
  return steps.flatMap(({ journey, title }) => {
    const seen = e.prove?.journeys.find((j) => j.name === journey)?.steps.find((s) => s.name === title);
    return seen === undefined ? [`prove did not run the step "${title}" of "${journey}"`] : seen.verdict === "pass" ? [] : [`the step "${title}" of "${journey}" is ${seen.verdict}`];
  });
});

/** error.sdk: the SDK exports the errors, and the refusal's class is a tagged error carrying its code, which each giving operation's error channel has. */
export const sdk = over("error.sdk", (f, e) => {
  const errors = e.files["generated/api/src/errors.ts"] ?? "";
  const cls = Reading.classText(errors, f.name);
  return [
    ...(Reading.exportedNames(e.files["generated/sdk/src/index.ts"] ?? "").some((n) => n.exported === "Errors") ? [] : ["the SDK does not export the errors"]),
    ...(cls === undefined ? [`errors.ts has no class ${f.name}`] : /extends Schema\.TaggedError</.test(cls) && /static readonly code = /.test(cls) ? [] : [`${f.name} is not a tagged error with a static code`]),
    ...f.operations.filter((name) => !Reading.hasName(listedErrors(e.files[`generated/api/src/${e.model.operations[name]!.thing}/${e.model.operations[name]!.verb}.ts`] ?? ""), f.name)).map((name) => `${name}'s call does not have ${f.name} in its error channel`),
  ];
});
