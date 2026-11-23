// The `## Worked examples` of an operation's page (W2): each journey that calls the operation, as the model holds it. Every
// step that calls it, in order: its title, who calls, what is sent, what comes back. Nothing is run and nothing is invented:
// a value the journey takes from its starting world or an earlier step is a reference, and is named in words from its path.
import type { Model, OperationModel } from "@orthograph/compiler";

type Journey = Model["journeys"][string];
type Step = Journey["steps"][number];
type Called = Extract<Step, { readonly call: unknown }>;
interface Check { readonly kind: string; readonly error?: string; readonly fields?: Readonly<Record<string, unknown>>; readonly value?: unknown; readonly match?: string }

const refOf = (value: unknown): ReadonlyArray<string> | undefined =>
  typeof value === "object" && value !== null && Array.isArray((value as { ref?: unknown }).ref) ? (value as { ref: ReadonlyArray<unknown> }).ref.map(String) : undefined;

/** A reference in words from its path: `["world", "handle"]` is "the world's handle", and what an earlier call made is "the last call's". */
const words = (path: ReadonlyArray<string>): string => {
  const [first = "", ...rest] = path;
  return `${first === "last" ? "the last call's" : `the ${first}'s`} ${rest.join(" ")}`.trim();
};

/** A value by its content: a literal as itself, a reference in words, a list or an object by what it holds. */
const shown = (value: unknown): string => {
  const ref = refOf(value);
  if (ref !== undefined) return words(ref);
  if (Array.isArray(value)) return `[${value.map(shown).join(", ")}]`;
  if (typeof value === "object" && value !== null) return `{ ${Object.entries(value).map(([k, v]) => `${k}: ${shown(v)}`).join(", ")} }`;
  return typeof value === "string" ? `\`${value}\`` : String(value);
};

/** The refusal a journey step names: a declared or runtime error by its name, or the machine's (`link.notFrom`) or the thing's own (`person.notFound`) by the thing. */
const refusalOf = (model: Model, error: string): string => {
  const [thing, kind] = error.split(".");
  const t = thing === undefined ? undefined : model.things[thing];
  return kind === "notFrom" ? t?.machine?.notFrom.error ?? error : kind === "notFound" ? t?.notFound?.error ?? error : error;
};

const callerOf = (journey: Journey, actor: string): string => {
  const who = journey.cast[actor];
  if (who === undefined) return `\`${actor}\``;
  const kind = who.kind === "role" ? `role ${who.role}` : who.kind === "role-of" ? `role of ${who.role} on its ${who.path}` : who.kind.replace(/-/g, " ");
  return `\`${actor}\` (${kind})`;
};

/** What comes back: a refusal by name and code with its checked fields, else the answer the step checks, else just that it was answered. */
const outcomeOf = (model: Model, step: Called): string => {
  const checks = step.checks as ReadonlyArray<Check>;
  const refusal = checks.find((c) => c.kind === "refuses" && c.error !== undefined);
  if (refusal?.error !== undefined) {
    const name = refusalOf(model, refusal.error);
    const fields = Object.entries(refusal.fields ?? {}).map(([k, v]) => `${k} ${shown(v)}`);
    return `is refused with ${name}, ${model.refusals[name] ?? "?"}${fields.length > 0 ? `, carrying ${fields.join(", ")}` : ""}`;
  }
  const answers = checks.flatMap((c) => (c.kind === "expect-equal" ? [`gets back ${shown(c.value)}`] : c.kind === "expect" && c.match !== undefined ? [`gets back an answer matching \`${c.match}\``] : []));
  return answers.length > 0 ? answers.join(" and ") : "is answered";
};

const stepLine = (model: Model, journey: Journey, step: Called): string => {
  const { call } = step;
  const sent = Object.entries(call.payload ?? {}).map(([k, v]) => `${k} ${shown(v)}`);
  const sends = sent.length === 0 ? "sends nothing" : `sends ${sent.join(", ")}`;
  return `- **${step.title}.** ${callerOf(journey, call.actor)} calls and ${sends}${call.request === undefined ? "" : `, with the request key \`${call.request}\``}, and ${outcomeOf(model, step)}.`;
};

/** The section for one operation, or nothing when no journey calls it. */
export const workedExamples = (model: Model, op: OperationModel): ReadonlyArray<string> => {
  const entries = Object.values(model.journeys ?? {}).flatMap((journey) => {
    const mine = journey.steps.filter((s): s is Called => "call" in s && s.call.operation === op.name);
    return mine.length === 0 ? [] : [["", `### ${journey.name}`, "", journey.starts == null ? "Starts from an empty world." : `Starts from the world \`${journey.starts}\`.`, "", ...mine.map((s) => stepLine(model, journey, s))]];
  });
  return entries.length === 0 ? [] : ["", "## Worked examples", ...entries.flat()];
};
