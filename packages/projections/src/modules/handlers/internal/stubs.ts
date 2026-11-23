// `ortho add journeys <thing>` (K16 e): a journey stub per path through the thing's machine, then, per operation and read
// by name, one per allowed role no machine stub casts, one caller turned away, and one per declared error. Every world,
// payload and expected field is a `Blueprint.todo`, so `ortho check` names each until it is filled.
import type { AllowedModel, Model, OperationModel } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";
import { camel, lines, local, scaffolded } from "#modules/names/service.js";
import { whoLines } from "./header.ts";
import { callsOf, machinePaths, type MachinePath } from "./paths.ts";
import { allowedFile, an, callerOf, columns, refusalsOf, roleName, thingFile } from "./words.ts";

/** A blueprint file as a journey in `blueprint/journeys/` imports it. */
const rel = (file: string) => (file.startsWith("blueprint/") ? `../${file.slice("blueprint/".length)}` : file);
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const todo = (what: string) => `Blueprint.todo(${JSON.stringify(what)})`;
const roleOf = (a: AllowedModel) => (a.kind === "role" || a.kind === "role-of" ? roleName(a.role) : undefined);

/** The cast for one `allowed` entry: the role itself (imported), or someone signed in, or anyone. */
const castOf = (model: Model, op: OperationModel, a: AllowedModel | undefined) => {
  const role = a ? roleOf(a) : undefined;
  // A move made by time is the keeper's alone: anyone else is refused, so its journeys cast the keeper (M8-checks call 4).
  if (a?.kind === "keeper") return { actor: "keeper", cast: "{ keeper: Blueprint.keeper }", imports: [] };
  if (a && role) return { actor: role, cast: `{ ${role} }`, imports: [`import { ${role} } from "${rel(allowedFile(model, op, a))}";`] };
  return { actor: "someone", cast: `{ someone: Blueprint.${a?.kind === "signed-in" ? "signedIn" : "anyone"} }`, imports: [] };
};

interface Stub {
  readonly name: string;
  readonly from: string;
  readonly imports: ReadonlyArray<string>;
  readonly doc: ReadonlyArray<string>;
  readonly title: string;
  readonly cast: { readonly actor: string; readonly cast: string; readonly imports: ReadonlyArray<string> };
  readonly starts: string;
  readonly payload: string;
  readonly checks: ReadonlyArray<string>;
}

/**
 * The call's payload, one blank saying what goes there. A read's `run` is an overload a bare blank can't be inferred
 * through, so its blank is typed `never`, which fits any payload.
 */
const payloadArg = (op: OperationModel, what: string) => (op.kind === "read" ? `Blueprint.todo<never>(${JSON.stringify(what)})` : todo(what));

const render = (op: OperationModel, s: Stub): RenderedFile => ({
  path: `blueprint/journeys/${op.thing}-${op.verb}-${s.name}.ts`,
  scaffold: true,
  content: lines(
    scaffolded(s.from),
    s.imports,
    `import ${local(camel(op.verb))} from "${rel(op.file)}";`,
    "",
    "/**", s.doc.map((l) => ` * ${l}`), " */",
    `export default Blueprint.journey(${JSON.stringify(`${op.name}: ${s.title}`)}, {`,
    `  cast: ${s.cast.cast},`,
    `  starts: ${todo(s.starts)},`,
    "  steps: (s) => [",
    "    s.step(",
    `      ${JSON.stringify(`the ${s.cast.actor} calls ${op.name}`)},`,
    // The keeper fires a move for the instant it was due, which the stub leaves for the author like every other blank.
    `      s.${s.cast.actor}.run(${local(camel(op.verb))}, ${payloadArg(op, s.payload)}${s.cast.actor === "keeper" ? `, { due: ${todo(`the instant ${op.name} was due`)} }` : ""}),`,
    s.checks.map((c) => `      ${c},`),
    "    ),",
    "  ],",
    "});",
  ),
});

const payloadOf = (op: OperationModel, more = "") => `${op.name}'s payload${more}: ${Object.keys(op.payload).join(", ") || "none"}`;

const pathStub = (model: Model, op: OperationModel, p: MachinePath): RenderedFile => {
  const machine = model.things[op.thing]!.machine!;
  const cast = castOf(model, op, op.allowed[0]);
  const file = thingFile(model, op.thing, "machine");
  const head = `One path through the ${op.thing}'s machine, from ${file}:`;
  const isIn = (state: string) => `machine.isIn(${todo(`the ${op.thing}'s id`)}, ${JSON.stringify(state)})`;
  const machineImport = `import { machine } from "${rel(file)}";`;
  if (p.kind === "refused") {
    const from = machine.moves[p.move]!.from;
    const row = [p.from, p.move, `refused ${p.refusal} (exit ${machine.notFrom.exit}, ${machine.notFrom.code}), because ${p.move} starts only from ${from.join(" or ")}`];
    return render(op, {
      name: `refused-from-${p.from}`, from: file, title: `refused from ${p.from}`, cast,
      imports: [`import { Blueprint, noEvents, refuses } from "orthograph";`, machineImport, ...cast.imports],
      doc: [head, ...columns([row]).map((l) => `  ${l}`), `Refused: ${callerOf(op.allowed[0]!)} calls ${op.name} on ${an(op.thing)} in ${p.from}, and nothing changes.`],
      starts: `a starting world with ${an(op.thing)} in ${p.from}`, payload: payloadOf(op),
      checks: [`refuses(machine.notFrom, { state: ${JSON.stringify(p.from)} })`, "noEvents()", isIn(p.from)],
    });
  }
  const fields = Object.keys(model.things[op.thing]!.events[p.emits] ?? {});
  const row = [p.from ?? "(creates)", p.move, p.to, `${p.emits}, by ${op.name}`];
  const outcomes = machine.moves[p.move]!.to.length;
  return render(op, {
    name: p.from === null ? `created-in-${p.to}` : `${p.from}-to-${p.to}`, from: file, cast,
    title: p.from === null ? `created in ${p.to}` : `${p.from} to ${p.to}`,
    imports: [`import { Blueprint, emits } from "orthograph";`, machineImport, ...cast.imports, `import { ${p.emits} } from "${rel(thingFile(model, op.thing, "events"))}";`],
    doc: [head, ...columns([row]).map((l) => `  ${l}`), p.from === null
      ? `Allowed: ${callerOf(op.allowed[0]!)} calls ${op.name}, and the ${op.thing} is created in ${p.to}.`
      : `Allowed: ${callerOf(op.allowed[0]!)} calls ${op.name} on ${an(op.thing)} in ${p.from}, and it ends in ${p.to}.`],
    starts: p.from === null ? `a starting world where ${op.name} can run` : `a starting world with ${an(op.thing)} in ${p.from}`,
    payload: payloadOf(op, outcomes > 1 ? `, one that ends in ${p.to}` : ""),
    checks: [`emits(${p.emits}, ${fields.length ? todo(`${p.emits}'s fields: ${fields.join(", ")}`) : "{}"})`, isIn(p.to)],
  });
};

/** Who may call: one stub per allowed entry no machine stub casts, then one caller turned away (none for anyone). */
const roleStubs = (model: Model, op: OperationModel, machined: boolean): ReadonlyArray<RenderedFile> => {
  const doc = whoLines(model, op, `Who may call ${op.name}`);
  const entries = op.allowed.slice(machined ? 1 : 0);
  const taken = (a: AllowedModel) => entries.filter((b) => (roleOf(b) ?? b.kind) === (roleOf(a) ?? a.kind)).length > 1;
  // Two entries of one role (`owner.of("source")`, `owner.of("destination")`) are told apart by the field they follow.
  const named = (a: AllowedModel) => `allowed-${roleOf(a) ?? a.kind}${taken(a) && a.kind === "role-of" ? `-${kebab(a.path)}` : ""}`;
  const allowed = entries.map((a) => {
    const cast = castOf(model, op, a);
    return render(op, {
      name: named(a), from: allowedFile(model, op, a), cast, title: `allowed ${roleOf(a) ? `the ${roleOf(a)}` : callerOf(a)}`,
      imports: [`import { Blueprint } from "orthograph";`, ...cast.imports],
      doc: [...doc, `Allowed: ${callerOf(a)} calls ${op.name}, and it answers.`],
      starts: `a starting world where ${op.name} can run`, payload: payloadOf(op),
      checks: [todo(`what ${op.name} answers: ${Object.keys(op.answer).join(", ") || "nothing"}`)],
    });
  });
  if (op.allowed.some((a) => a.kind === "anyone") || op.allowed.length === 0) return allowed;
  const anonymous = op.allowed.some((a) => a.kind === "signed-in");
  const roles = op.allowed.flatMap((a) => roleOf(a) ?? []);
  const refused = op.allowed.some((a) => a.kind === "keeper")
    ? { name: "refused-not-the-keeper", title: "refused a caller who isn't the keeper", cast: { actor: "someone", cast: "{ someone: Blueprint.anyone }", imports: [] }, who: "someone who isn't the keeper" }
    : anonymous
    ? { name: "refused-anonymous", title: "refused a caller who isn't signed in", cast: { actor: "visitor", cast: "{ visitor: Blueprint.anyone }", imports: [] }, who: "someone not signed in" }
    : { name: `refused-not-${roles.join("-or-")}`, title: `refused a caller who isn't the ${roles.join(" or ")}`, cast: { actor: "stranger", cast: "{ stranger: Blueprint.signedIn }", imports: [] }, who: `someone signed in who isn't ${op.allowed.map(callerOf).join(" or ")}` };
  return [...allowed, render(op, {
    ...refused, from: allowedFile(model, op, op.allowed[0]!),
    imports: [`import { Blueprint, noEvents, refuses } from "orthograph";`],
    doc: [...doc, `Refused: ${refused.who} calls ${op.name}, and nothing changes.`],
    starts: `a starting world where ${op.name} can run`, payload: payloadOf(op),
    checks: ["refuses(Blueprint.NotAllowed)", "noEvents()"],
  })];
};

/** One stub per declared error, cast as the first allowed role, its fields a blank. */
const errorStubs = (model: Model, op: OperationModel): ReadonlyArray<RenderedFile> =>
  refusalsOf(model, op).filter((r) => r.giver === "yours").map((r) => {
    const cast = castOf(model, op, op.allowed[0]);
    const caller = op.allowed[0] ? callerOf(op.allowed[0]) : "anyone";
    return render(op, {
      name: `refused-${kebab(r.name)}`, from: r.file, title: `refused ${r.name}`, cast,
      imports: [`import { Blueprint, noEvents, refuses } from "orthograph";`, ...cast.imports, `import { ${r.name} } from "${rel(r.file)}";`],
      doc: [`One refusal of ${op.name}, from ${r.file}:`, `  ${r.name} (exit ${r.exit}, ${r.code})${r.fields.length ? `, carrying ${r.fields.join(", ")}` : ""}`,
        `Refused: ${caller} calls ${op.name} with a payload that triggers it, and nothing changes.`],
      starts: `a starting world where ${op.name} can be refused ${r.name}`, payload: payloadOf(op, ` that triggers ${r.name}`),
      checks: [`refuses(${r.name}${r.fields.length ? `, ${todo(`${r.name}'s fields: ${r.fields.join(", ")}`)}` : ""})`, "noEvents()"],
    });
  });

export const renderJourneyStubs = (model: Model, thing: string): ReadonlyArray<RenderedFile> => {
  const paths = machinePaths(model, thing);
  const machined = new Set(paths.map((p) => p.operation));
  return [
    ...paths.map((p) => pathStub(model, model.operations[p.operation]!, p)),
    ...callsOf(model, thing).filter((op) => op.from.kind === "app").flatMap((op) => [...roleStubs(model, op, machined.has(op.name)), ...errorStubs(model, op)]),
  ];
};
