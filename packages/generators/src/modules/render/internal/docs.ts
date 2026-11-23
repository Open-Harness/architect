// generated/docs: a page per thing (its fields, machine and roles) and per operation (who may call, what goes in and
// out, its move, every refusal with its exit code, and how to call it). Markdown, read by people and by agents.
import type { FieldModel, Model, OperationModel, ThingModel } from "@orthograph/compiler";
// `who` is the scaffold's own sentence (K16 a), so the docs page and the handler's front matter never disagree.
import { workedExamples } from "./examples.ts";
import { IDEMPOTENCY_CONFLICT, IDEMPOTENCY_CONFLICT_EXIT, NOT_ALLOWED_EXIT, lines, ruleBehind, ruleSentence, who, type RenderedFile } from "@orthograph/projections/shared";

type FieldsModel = Readonly<Record<string, FieldModel>>;
import { timeMoveOf, whenWords } from "@orthograph/projections/shared";
const MARK = "<!-- Generated from the blueprint. Do not edit. -->";

/** A sentence in a table cell: a `|` would end the cell, a line break the row. */
const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

const kindOf = (f: FieldModel) => f.ref ?? f.named ?? (f.value.type === "schema" && f.value.format === "ref-any" ? "any thing (declaration and id)" : f.value.type);
const markOf = (f: FieldModel) => (f.visibility ? ` (${f.visibility === "secret" ? "secret" : `private to ${f.visibility.private.join(", ")}`})` : "");

const fieldRows = (fields: FieldsModel) =>
  Object.keys(fields).length === 0
    ? ["(none)"]
    : Object.values(fields).some((f) => f.description !== undefined)
      ? ["| field | value | description |", "|---|---|---|", ...Object.entries(fields).map(([k, f]) => `| ${k}${f.optional ? " (optional)" : ""} | ${kindOf(f)}${markOf(f)} | ${cell(f.description ?? "")} |`)]
      : ["| field | value |", "|---|---|", ...Object.entries(fields).map(([k, f]) => `| ${k}${f.optional ? " (optional)" : ""} | ${kindOf(f)}${markOf(f)} |`)];

/** Each event the thing declares, with the fields it carries and the move that emits it. */
const eventRows = (t: ThingModel) =>
  Object.entries(t.events).map(([name, fields]) => {
    const carries = Object.keys(fields).length === 0 ? "carries nothing" : `carries ${Object.entries(fields).map(([k, f]) => `${k} (${kindOf(f)}${markOf(f)}${f.description === undefined ? "" : `: ${f.description}`})`).join(", ")}`;
    const by = Object.entries(t.machine?.moves ?? {}).filter(([, m]) => m.emits === name).map(([k]) => k);
    return `- \`${name}\`: ${carries}${by.length > 0 ? `; emitted by the move ${by.join(", ")}` : ""}`;
  });

/** Each rule the thing holds (G5): its full name, the sentence every output says, where it holds, and the refusal it makes. */
const invariantRows = (t: ThingModel) =>
  Object.entries(t.invariants ?? {}).map(([name, r]) =>
    `- \`${t.name}.${name}\`: ${ruleSentence(t.name, r)}. Unique on ${r.fields.join(", ")}, ${r.while?.length ? `while ${r.while.join(" or ")}` : "in every state"}; ${r.refuse ? `refused ${r.refuse}` : "refuses nothing, a break is a defect"}.`);

/** Every refusal the operation can give, with its exit code and what it means. */
const refusals = (model: Model, op: OperationModel) => {
  const thing = model.things[op.thing];
  return op.refusals.map((r) => {
    const declared = thing?.errors[r];
    const code = model.refusals[r] ?? "?";
    // A rule's refusal (G5): the runtime's, why in the rule's one sentence, and which rule.
    const rule = ruleBehind(model, op, r);
    // The error is the rule's own thing's, which is not always the operation's (a step that writes another thing breaks that thing's rule).
    const refused = rule ? model.things[rule.thing]?.errors[r] : undefined;
    if (rule && refused) return `| ${r} | ${refused.exit} | ${code} | ${cell(`${rule.sentence}; by the rule ${rule.full}`)}${Object.keys(refused.fields).length ? `, carrying ${Object.keys(refused.fields).join(", ")}` : ""} |`;
    if (declared) return `| ${r} | ${declared.exit} | ${code} | declared in errors.ts${Object.keys(declared.fields).length ? `, carrying ${Object.keys(declared.fields).join(", ")}` : ""} |`;
    // Only a blueprint with a keeper lists NotAllowed on an operation open to anyone: the keeper is the one caller it turns away.
    if (r === "NotAllowed" && op.allowed.every((a) => a.kind === "anyone")) return `| NotAllowed | ${NOT_ALLOWED_EXIT} | ${code} | the caller is the keeper, which calls only the moves time makes; the handler never runs |`;
    const missing = Object.entries(op.notFound ?? {}).filter(([, e]) => e === r).map(([k]) => k);
    if (missing.length > 0) return `| ${r} | ${Object.values(model.things).find((t) => t.notFound?.error === r)?.notFound?.exit ?? "?"} | ${code} | nothing has the id in ${missing.join(", ")}; the handler never runs; carries \`id\` |`;
    if (r === "NotAllowed") return `| NotAllowed | ${NOT_ALLOWED_EXIT} | ${code} | the caller isn't ${who(op)}; the handler never runs |`;
    if (r === IDEMPOTENCY_CONFLICT) return `| ${IDEMPOTENCY_CONFLICT} | ${IDEMPOTENCY_CONFLICT_EXIT} | ${code} | the request key was first used with another payload; the handler never runs |`;
    return `| ${r} | ${thing?.machine?.notFrom.exit ?? "?"} | ${code} | the ${op.thing} is in a state ${op.move?.key ?? "this"} can't start from; carries \`state\` |`;
  });
};

const operationPage = (model: Model, op: OperationModel, project: string): RenderedFile => ({
  path: `generated/docs/${op.thing}/${op.verb}.md`,
  scaffold: false,
  content: lines(
    MARK,
    `# ${op.name}`,
    "",
    op.description,
    "",
    [
      `**Who may call:** ${who(op)}.`,
      op.kind === "read" ? `**A read:** answered from the records, with no handler.${op.list ? ` A page of ${op.list.page} at a time, ${op.list.order === "newest" ? "newest" : "oldest"} first, narrowed by ${op.list.where.join(", ") || "nothing"}; pass the answer's \`next\` as \`cursor\` for the page after it.` : ""}` : "",
      timeMoveOf(model, op) ? `**When:** ${whenWords(op.thing, timeMoveOf(model, op)!, "`")}.` : "",
      op.idempotent === "request" ? "**Idempotent by request:** send `idempotency-key`; the same key twice is one call." : "",
      op.budget ? `**Budget:** p95 ${op.budget.p95Ms}ms.` : "",
    ].filter((l) => l !== "").join("\n\n"),
    "", "## Payload", "", fieldRows(op.payload), "", "## Answer", "", fieldRows(op.answer),
    op.move ? ["", "## Move", "", `\`${op.move.key}\`: from ${op.move.from.length ? op.move.from.join(" or ") : "nothing (it creates)"} to ${op.move.to.join(" or ")}, emitting ${op.move.emits}.`] : [],
    Object.keys(op.steps).length ? ["", "## Steps", "", ...Object.values(op.steps).map((s) => `- \`${s.name}\` (${s.type})`)] : [],
    "", "## Refusals", "", op.refusals.length ? ["| refusal | exit | code | when |", "|---|---|---|---|", ...refusals(model, op)] : ["(none)"],
    workedExamples(model, op),
    "", "## How to call", "",
    "```sh", `${project} ${op.thing} ${op.verb} ${Object.entries(op.payload).map(([k, f]) => (f.optional ? `[--${k} <${k}>]` : `--${k} <${k}>`)).join(" ")}`.trimEnd(), "```",
    "", `HTTP: \`POST /${op.thing}/${op.verb}\` with the payload as JSON. SDK: \`Sdk.${op.thing}.${op.verb}(payload)\`.`,
  ),
});

const thingPage = (model: Model, t: ThingModel): RenderedFile => {
  const ops = Object.values(model.operations).filter((o) => o.thing === t.name);
  return {
    path: `generated/docs/${t.name}/index.md`,
    scaffold: false,
    content: lines(
      MARK,
      `# ${t.name}`,
      "",
      t.description,
      "", `Lives in ${t.lives === "actor" ? "its own Durable Object" : "the database"}${t.store ? `, in the store ${t.store}` : ""}.`,
      "", "## Fields", "", fieldRows(t.fields),
      t.machine ? ["", "## Machine", "", `States: ${t.machine.states.join(", ")}. A move from the wrong state is refused ${t.machine.notFrom.error} (exit ${t.machine.notFrom.exit}).`, "",
        "| move | from | to | emits |", "|---|---|---|---|",
        ...Object.entries(t.machine.moves).map(([k, m]) => `| ${k} | ${m.from.join(", ") || "(creates)"} | ${m.to.join(", ")} | ${m.emits} |`),
        // Only a machine with a move made by time says when it happens; every other thing's page is as it was.
        ...(Object.values(t.machine.moves).some((m) => m.by !== undefined)
          ? ["", "Moves made by time:", "", ...Object.entries(t.machine.moves).flatMap(([k, m]) => (m.by === undefined ? [] : [`- ${k}: ${whenWords(t.name, { by: m.by, ...(m.late === undefined ? {} : { late: m.late }), ...(m.lazy === undefined ? {} : { lazy: m.lazy }) }, "`")}`]))]
          : [])] : [],
      Object.keys(t.invariants ?? {}).length ? ["", "## Invariants", "", ...invariantRows(t)] : [],
      Object.keys(t.events).length ? ["", "## Events", "", ...eventRows(t)] : [],
      t.roles.length ? ["", "## Roles", "", ...t.roles.map((r) => `- ${r}`)] : [],
      "", "## Operations", "", ops.length ? ops.map((o) => `- [${o.name}](${o.verb}.md): ${o.description}`) : ["(none yet)"],
    ),
  };
};

export const renderDocs = (model: Model, project: string): ReadonlyArray<RenderedFile> => [
  ...Object.values(model.things).map((t) => thingPage(model, t)),
  ...Object.values(model.operations).map((op) => operationPage(model, op, project)),
];
