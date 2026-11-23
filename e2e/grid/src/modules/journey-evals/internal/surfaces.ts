import type { CellId, Eval } from "../../grid/types.ts";
import type { JourneyModel, ProjectEvidence } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";

const journeyOf = (e: ProjectEvidence, subject: string): JourneyModel | undefined => Object.values(e.model.journeys ?? {}).find((j) => j.name === subject);
const over = (cell: CellId, problems: (journey: JourneyModel, evidence: ProjectEvidence, subject: string) => ReadonlyArray<string>): Eval<ProjectEvidence> =>
  Reading.over(cell, "journey", journeyOf, problems);

/** The steps that run: a step whose operation is outside the model is skipped and runs nothing. */
const running = (journey: JourneyModel) => journey.steps.filter((s) => s.skipped === undefined);
/** The operations a journey calls in its own steps. */
const calls = (journey: JourneyModel): ReadonlyArray<string> => [...new Set(running(journey).flatMap((s) => (s.call === undefined ? [] : [s.call.operation])))];

/** journey.model: the journey is in the model with a cast, a start that exists and steps that call real operations, and prove ran every one green. */
export const model = over("journey.model", (journey, e) => {
  const ran = e.prove?.journeys.find((j) => j.name === journey.name);
  return [
    ...(running(journey).length === 0 ? ["it has no steps that run"] : []),
    ...(journey.cast === undefined || Object.keys(journey.cast).length === 0 ? ["it has no cast"] : []),
    ...(journey.starts != null && e.model.startingWorlds?.[journey.starts] === undefined ? [`it starts in ${journey.starts}, which the model has no starting world for`] : []),
    ...calls(journey).filter((op) => e.model.operations[op] === undefined).map((op) => `a step calls ${op}, which the model does not have`),
    ...(e.prove === undefined ? ["no prove run was read, so the journey was not seen to run"]
      : ran === undefined ? [`prove's report has no journey ${journey.name}`]
      : [
        ...(ran.verdict === "pass" ? [] : [`prove reports the journey ${ran.verdict}`]),
        ...(ran.steps.length === running(journey).length ? [] : [`prove ran ${ran.steps.length} of its ${running(journey).length} steps`]),
        ...ran.steps.filter((s) => s.verdict !== "pass").map((s) => `step "${s.name}" is ${s.verdict}`),
      ]),
  ];
});

/**
 * journey.server: the deployed server serves no journey: nothing it was generated from names this one. (That `/_world/*` answers only in an
 * environment that declares a lifetime is not judged here: it needs the server run in one that does not, which waits for `prove --through`.)
 */
export const server = over("journey.server", (journey, e) =>
  Object.entries(e.files).filter(([path, text]) => path.startsWith("generated/server/") && text.includes(journey.name)).map(([path]) => `${path} names "${journey.name}": the server carries a journey`));

/** A value the journey takes from its starting world (or an earlier step) is a reference in the model: `{ ref: ["world", "handle"] }`. */
const refOf = (value: unknown): ReadonlyArray<string> | undefined =>
  typeof value === "object" && value !== null && Array.isArray((value as { ref?: unknown }).ref) ? (value as { ref: ReadonlyArray<unknown> }).ref.map(String) : undefined;
/** What a structured value is made of, wherever a reference sits in it (an array, an object, however deep): each reference's path, and each literal's text (a number or a boolean is bare: a token, never a part of a word or a number). */
interface Leaves { readonly refs: ReadonlyArray<ReadonlyArray<string>>; readonly literals: ReadonlyArray<{ readonly text: string; readonly bare: boolean }> }
const leavesOf = (value: unknown): Leaves => {
  const ref = refOf(value);
  if (ref !== undefined) return { refs: [ref], literals: [] };
  if (Array.isArray(value)) return value.map(leavesOf).reduce<Leaves>((all, one) => ({ refs: [...all.refs, ...one.refs], literals: [...all.literals, ...one.literals] }), { refs: [], literals: [] });
  if (typeof value === "object" && value !== null) return leavesOf(Object.values(value));
  return { refs: [], literals: value === undefined || value === null ? [] : [{ text: String(value), bare: typeof value !== "string" }] };
};
/** An id as the runtime makes one (`hdl_9f31ab42`): the page never shows one for a value the journey does not write. */
const INVENTED = /\b[a-z]{2,5}_[0-9a-z]{6,}\b/;
const hasWords = (text: string, words: ReadonlyArray<string>) => words.every((w) => Reading.hasName(text, w));
/** What a page must show of one value, in its stretch: every literal by its value, every reference in words from its path, and no id where a reference sits. */
const valueProblems = (segment: string, value: unknown, label: string): ReadonlyArray<string> => {
  const { refs, literals } = leavesOf(value);
  return [
    ...refs.filter((r) => !hasWords(segment, r)).map((r) => `does not name ${label} in the words ${r.join(" ")}`),
    ...literals.filter((l) => !(l.bare ? Reading.hasName(segment, l.text) : segment.includes(l.text))).map((l) => `does not show ${label} ${l.text}`),
    ...(refs.length > 0 && INVENTED.test(segment) ? [`writes an id where ${label} is the journey's ${refs.map((r) => r.join(" ")).join(", ")}`] : []),
  ];
};

/** The words under a `###` (or deeper) heading that is the journey's name, up to the next heading of the same or a higher level. */
const entryOf = (section: string, name: string): string | undefined => {
  const lines = section.split("\n");
  const level = (l: string) => /^(#{1,6})\s/.exec(l)?.[1]?.length;
  const start = lines.findIndex((l) => (level(l) ?? 0) >= 3 && Reading.plain(l.replace(/^#{1,6}\s+/, "").replace(/\s+#+\s*$/, "")).trim() === name);
  if (start < 0) return undefined;
  const mine = level(lines[start]!)!;
  const end = lines.findIndex((l, i) => i > start && (level(l) ?? 99) <= mine);
  return Reading.plain(lines.slice(start + 1, end < 0 ? undefined : end).join("\n"));
};

/** The refusal a journey step names: a declared or runtime error by its name, or the machine's (`link.notFrom`) or the thing's own (`person.notFound`) by the thing. */
export const refusalOf = (model: ProjectEvidence["model"], error: string): string => {
  const [thing, kind] = error.split(".");
  const t = thing === undefined ? undefined : model.things[thing];
  return kind === "notFrom" ? t?.machine?.notFrom.error ?? error : kind === "notFound" ? t?.notFound?.error ?? error : error;
};

/** One step's example, judged in the stretch of the entry from its title to the next step's: who, what was sent, what came back. */
const stepProblems = (step: JourneyModel["steps"][number], segment: string, journey: JourneyModel, e: ProjectEvidence) => {
  const call = step.call!;
  const who = journey.cast?.[call.actor];
  const flat = segment.replace(/-/g, " ").toLowerCase();
  const refusal = step.checks?.find((c) => c.kind === "refuses");
  const refused = refusal?.error === undefined ? undefined : refusalOf(e.model, refusal.error);
  // What comes back is looked for after what was sent: the title, the caller, the payload and the request key come first, so a stray 1 up there is no answer.
  const sent = [call.actor, call.request, ...Object.keys(call.payload ?? {}), ...leavesOf(call.payload ?? {}).literals.map((l) => l.text), ...leavesOf(call.payload ?? {}).refs.map((r) => r[r.length - 1]!)]
    .flatMap((piece) => (piece === undefined ? [] : [segment.indexOf(piece) < 0 ? 0 : segment.indexOf(piece) + piece.length]));
  const outcome = segment.slice(Math.max(0, ...sent));
  const answers = (step.checks ?? []).filter((c) => c.kind === "expect-equal" || c.kind === "expect");
  return [
    ...(Reading.hasName(segment, call.actor) ? [] : [`does not name the caller ${call.actor}`]),
    ...(who === undefined ? [] : who.kind === "role"
      ? (who.role === undefined || Reading.hasName(segment, who.role) ? [] : [`does not name the role ${who.role} the caller holds`])
      : flat.includes(who.kind.replace(/-/g, " ").toLowerCase()) ? [] : [`does not say the caller is ${who.kind}`]),
    ...(call.request === undefined || Reading.hasName(segment, call.request) ? [] : [`does not show the request key ${call.request}`]),
    ...Object.entries(call.payload ?? {}).flatMap(([field, value]) => [
      ...(Reading.hasName(segment, field) ? [] : [`does not name the payload field ${field}`]),
      ...valueProblems(segment, value, `the payload ${field}`),
    ]),
    ...(refused === undefined
      ? (answers.length === 0
        ? (/\banswer(ed|s)?\b/i.test(outcome) ? [] : ["does not say it is answered (it checks no answer)"])
        : answers.flatMap((c) => c.kind === "expect" ? (c.match === undefined || outcome.includes(c.match) ? [] : [`does not show the answer it checks (${c.match})`]) : valueProblems(outcome, c.value, "the answer it checks")))
      : [
        ...(Reading.hasName(outcome, refused) && outcome.includes(e.model.refusals[refused] ?? "\0") ? [] : [`is not shown refused with ${refused}, ${e.model.refusals[refused] ?? "its code"}`]),
        ...valueProblems(outcome, refusal?.fields ?? {}, "the refusal's fields"),
        ...Object.keys(e.model.refusals).filter((other) => other !== refused && Reading.hasName(segment, other)).map((other) => `names ${other}, a refusal this step does not check`),
      ]),
  ];
};

/**
 * journey.docs (W2): each operation's page shows each journey that calls it as a worked example. In the journey's own entry (titled with its name) the page names the
 * starting world and, for every step of the journey that calls this operation and none that calls another, in order: the step's title, the caller by cast name and
 * kind, every payload field with the journey's value (a value from the world or an earlier step in words from its reference, never an id), and the refusal by name and
 * code or the answer the step checks. The content, not the markup; each piece is looked for within the journey's own entry, and each step's within its own stretch of it.
 */
export const docs = over("journey.docs", (journey, e) => calls(journey).flatMap((op) => {
  const model = e.model.operations[op];
  const path = model === undefined ? "" : `generated/docs/${model.thing}/${model.verb}.md`;
  const page = e.files[path] ?? "";
  const section = Reading.mdSection(page, "Worked examples");
  if (section === undefined) return [`${path || op} has no "Worked examples" section`];
  const entry = entryOf(section, journey.name);
  if (entry === undefined) return [`${path}'s Worked examples have no entry titled "${journey.name}"`];
  const mine = running(journey).filter((s) => s.call?.operation === op);
  const others = running(journey).filter((s) => s.call !== undefined && s.call.operation !== op && !mine.some((m) => Reading.plain(m.title).includes(Reading.plain(s.title))));
  const at = mine.map((s) => entry.indexOf(Reading.plain(s.title)));
  return [
    ...(journey.starts == null || Reading.hasName(entry, journey.starts) ? [] : [`${path}: the entry for "${journey.name}" does not name its starting world ${journey.starts}`]),
    ...mine.flatMap((step, i) => {
      if (at[i]! < 0) return [`${path}: the entry for "${journey.name}" leaves out the step "${step.title}"`];
      const next = at.slice(i + 1).find((p) => p >= 0);
      return stepProblems(step, entry.slice(at[i]!, next ?? undefined), journey, e).map((p) => `${path}: the step "${step.title}" ${p}`);
    }),
    ...(at.every((p) => p >= 0) && at.some((p, i) => i > 0 && p < at[i - 1]!) ? [`${path}: the steps of "${journey.name}" are not in the journey's order`] : []),
    ...others.filter((s) => entry.includes(Reading.plain(s.title))).map((s) => `${path}: the entry for "${journey.name}" lists the step "${s.title}", which calls ${s.call!.operation}, not ${op}`),
  ];
}));

/** journey.portal: each operation the journey calls shows it, in the portal's own part of its page (the proof tab), not in the docs it embeds. */
export const portal = over("journey.portal", (journey, e) => calls(journey).flatMap((op) => {
  const route = `/portal/operations/${op}`;
  const page = e.portal[route];
  if (page === undefined) return [`${route} could not be rendered`];
  return Reading.htmlText(Reading.portalOwn(page)).includes(journey.name) ? [] : [`${route} shows no proof from the journey "${journey.name}"`];
}));

/** journey.telemetry: each step the journey ran is a span under the journey's name, carrying `journey` and `journey.step`. */
export const telemetry = over("journey.telemetry", (journey, e) => {
  if (e.spans === undefined) return ["no spans were read from the prove run"];
  const spans = Reading.spansNamed(e.spans, `journey.${journey.name}`);
  const steps = new Set(spans.map((s) => String(s.attrs["journey.step"])));
  return [
    ...(spans.length === 0 ? [`no span named journey.${journey.name}`] : []),
    ...spans.filter((s) => s.attrs["journey"] !== journey.name).slice(0, 1).map((s) => `a journey.${journey.name} span has journey ${String(s.attrs["journey"] ?? "none")}`),
    ...(spans.length > 0 && steps.size < running(journey).length ? [`its spans cover ${steps.size} distinct steps, the journey ran ${running(journey).length}`] : []),
  ];
});
