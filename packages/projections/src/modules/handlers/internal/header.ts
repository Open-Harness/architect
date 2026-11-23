// The scaffold's front matter (K16 a): one doc block on the handler, so an editor shows it on hover, saying who may call,
// what comes in and goes out, every refusal, the thing's machine with this call's rows marked, and what the runtime does
// so the handler doesn't. Each part cites the blueprint file it came from; files only, never lines (K16 d).
import type { Model, OperationModel } from "@orthograph/compiler";
import { timeMoveOf, whenWords } from "#modules/names/service.js";
import { allowedFile, callerOf, columns, label, listed, refusalsOf, ruleOf, seenBy, thingFile, who } from "./words.ts";

/** What the runtime reads before the handler and hands in (K16 g): the subject, each referenced thing, a minted id. */
export interface HandedIn {
  /** The payload field naming the operation's own thing by id. */
  readonly subject: string | undefined;
  /** Each other payload field that references a thing's id, with that thing. */
  readonly refs: ReadonlyArray<{ readonly field: string; readonly thing: string }>;
  /** The move creates, so the runtime mints the new instance's id. */
  readonly mints: boolean;
}

const referenced = (model: Model, ref: string | undefined): string | undefined => {
  if (!ref) return undefined;
  const [thing, field] = ref.split(".");
  if (!thing || !field) return undefined;
  if (field === "id") return thing;
  const deeper = model.things[thing]?.fields[field]?.ref;
  return deeper?.endsWith(".id") ? deeper.slice(0, -3) : undefined;
};

export const handedIn = (model: Model, op: OperationModel): HandedIn => {
  const fields = Object.entries(op.payload);
  const subject = fields.find(([, f]) => f.ref === `${op.thing}.id`)?.[0];
  const refs = fields.flatMap(([field, f]) => {
    const thing = field === subject ? undefined : referenced(model, f.ref);
    return thing ? [{ field, thing }] : [];
  });
  return { subject, refs, mints: op.move !== null && op.move.from.length === 0 };
};

const fieldLines = (title: string, file: string, empty: string, fields: OperationModel["payload"]) =>
  Object.keys(fields).length === 0
    ? [empty]
    : [`${title}, from ${file}:`, ...columns(Object.entries(fields).map(([k, f]) => [k, `${label(f)}${f.optional ? " (optional)" : ""}${seenBy(f)}`])).map((l) => `  ${l}`)];

/** Who may call, each `allowed` entry with its role's rule, citing the roles file (shared with the journey stubs). */
export const whoLines = (model: Model, op: OperationModel, title = "Who may call") => {
  const files = [...new Set(op.allowed.map((a) => allowedFile(model, op, a)))];
  const one = files.length === 1;
  return [
    one ? `${title}, from ${files[0]}:` : `${title}:`,
    ...op.allowed.map((a) => {
      const rule = ruleOf(model, a);
      return `  ${callerOf(a)}${rule ? `: ${rule}` : ""}${one ? "" : `; from ${allowedFile(model, op, a)}`}`;
    }),
  ];
};

const refusalLines = (model: Model, op: OperationModel) => {
  const rows = refusalsOf(model, op);
  return rows.length === 0
    ? ["Refusals: none."]
    : ["Refusals:", ...columns(rows.map((r) => [r.name, `exit ${r.exit}`, r.code, `${r.said}; from ${r.file}`])).map((l) => `  ${l}`)];
};

const machineLines = (model: Model, op: OperationModel) => {
  const machine = model.things[op.thing]?.machine;
  if (!machine) return [];
  const rows = Object.entries(machine.moves).flatMap(([key, m]) =>
    (m.from.length ? m.from : ["(creates)"]).flatMap((from) => m.to.map((to) => ({ mark: key === op.move?.key, cells: [from, key, to, m.emits] }))));
  const table = columns([["from", "move", "to", "emits"], ...rows.map((r) => r.cells)]);
  return [
    `The ${op.thing}'s machine, from ${thingFile(model, op.thing, "machine")} (${op.move ? "▶ marks this call" : "this call makes no move"}):`,
    ...table.map((l, i) => `  ${i > 0 && rows[i - 1]!.mark ? "▶" : " "} ${l}`),
  ];
};

/** Where each field of the move's event comes from: the answer, else the payload, else the instance as the call left it. */
const eventSources = (model: Model, op: OperationModel, emits: string) => {
  const fields = Object.keys(model.things[op.thing]?.events[emits] ?? {});
  const source = (f: string) =>
    f in op.answer ? "the answer" : f in op.payload ? "the payload" : f in (model.things[op.thing]?.fields ?? {}) ? `the ${op.thing} as the call left it` : "nothing";
  const groups = new Map<string, Array<string>>();
  for (const f of fields) groups.set(source(f), [...(groups.get(source(f)) ?? []), f]);
  return [...groups].map(([from, fs]) => `${listed(fs)} from ${from}`).join(", ");
};

const runtimeLines = (model: Model, op: OperationModel) => {
  const machine = model.things[op.thing]?.machine;
  const hands = handedIn(model, op);
  const gated = op.allowed.some((a) => a.kind !== "anyone");
  const caller = op.allowed.every((a) => a.kind === "signed-in") ? "signed in" : who(op);
  const steps = Object.values(op.steps).map((s) => s.name);
  const event = op.move ? eventSources(model, op, op.move.emits) : "";
  const said = [
    gated ? `before it runs, it refuses NotAllowed unless the caller is ${caller}` : "",
    op.move?.from.length && machine ? `before it runs, it refuses ${machine.notFrom.error} unless the ${op.thing} is in ${op.move.from.join(" or ")}` : "",
    hands.subject ? `before it runs, it hands in the ${op.thing} it read as subject, so this handler never reads it again` : "",
    ...hands.refs.map((r) => {
      const missing = `${model.things[r.thing]?.identifier ?? r.thing}NotFound`;
      return `before it runs, it reads the ${r.field} and hands it in as refs.${r.field}${op.refusals.includes(missing) ? `, refusing ${missing} if there is none` : ""}`;
    }),
    hands.mints ? `before it runs, it mints the ${op.thing}'s new id and hands it in as id` : "",
    steps.length ? `each step is its own span: ${steps.join(", ")}` : "",
    op.move ? `once it answers, it sets the ${op.thing}'s state to ${op.move.to.length > 1 ? "the outcome given to move" : op.move.to[0]}` : "",
    op.move ? `once it answers, it writes ${op.move.emits}${event ? `: ${event}` : ""}` : "",
    `the call is the span ${op.name}, and its commit ${op.name}.commit`,
  ].filter(Boolean);
  return ["What the runtime does, so this handler doesn't:", ...said.map((s, i) => `  ${s}${i === said.length - 1 ? "." : ";"}`)];
};

/** The doc block, `/**` to `*\/`, with each part separated by an empty line. */
export const header = (model: Model, op: OperationModel): ReadonlyArray<string> => {
  const promises = [
    op.idempotent === "request" ? `Idempotent by request, from ${op.file}: the same request key from the same caller is one call.` : "",
    timeMoveOf(model, op) ? `Made by time, from ${thingFile(model, op.thing, "machine")}: ${whenWords(op.thing, timeMoveOf(model, op)!, "")}.` : "",
    op.budget ? `Budget, from ${op.file}: p95 ${op.budget.p95Ms}ms.` : "",
  ].filter(Boolean);
  const parts = [
    [`${op.name}: ${op.description}`],
    whoLines(model, op),
    fieldLines("Payload", op.file, "Payload: none.", op.payload),
    fieldLines("Answer", op.file, "Answer: nothing.", op.answer),
    refusalLines(model, op),
    promises,
    machineLines(model, op),
    runtimeLines(model, op),
  ].filter((p) => p.length > 0);
  const body = parts.flatMap((p, i) => (i === 0 ? p : ["", ...p]));
  return ["/**", ...body.flatMap((l) => l.split("\n")).map((l) => (l === "" ? " *" : ` * ${l.replaceAll("*/", "*\\/")}`)), " */"];
};
