import { IDEMPOTENCY_CONFLICT } from "@orthograph/projections/shared";
import type { BriefApi, Briefed } from "./types.ts";

const forbidden = [
  "blueprint/**", "blueprint/journeys/**", "blueprint/starting-worlds/**", "journeys/**", "generated/**", "test/**",
] as const;

/** The nine evals, in their numbered order, as prove prints them. */
const EVALS = ["answer shape", "declared errors", "machine path", "events", "who may call", "steps", "performance", "coverage", "explainability"];

const of: BriefApi["of"] = (model, name, journeys): Briefed => {
  // An operation with a blank is not in the model's operations until it is filled (#742): say that, and which blanks, not "no such operation".
  const blank = model.blankOperations?.[name];
  if (blank && blank.kind !== "operation") return { unknown: `${name} is a read, which has no handler to brief, and it still has ${blank.blanks.length} blank${blank.blanks.length === 1 ? "" : "s"} in ${blank.file}` };
  if (blank) {
    return { unknown: [`${name} has no brief yet: it still has ${blank.blanks.length} blank${blank.blanks.length === 1 ? "" : "s"} in ${blank.file}`, ...blank.blanks.map((b) => `  ${b}`), `Fill ${blank.blanks.length === 1 ? "it" : "them"}, then run ortho brief ${name} again.`].join("\n") };
  }
  const op = model.operations[name];
  if (!op || op.kind !== "operation") return { unknown: `${name} is not an operation with a handler: ${Object.values(model.operations).filter((o) => o.kind === "operation").map((o) => o.name).join(", ")}` };
  const thing = model.things[op.thing]!;
  const own = `things/${op.thing}/verbs/${op.verb}.ts`;
  const calling = journeys.filter((j) => j.text.includes(own)).map((j) => j.path);
  const declared = op.errors.map((e) => `${e} (exit ${thing.errors[e]?.exit ?? "?"})`);
  // A reused request key (IdempotencyConflict) is met by the caller, not made by a handler: the brief names only what a handler might wrongly refuse.
  // A rule's refusal is the runtime's too, but it comes after the handler: the rule is checked once the move is made, before the commit (G5).
  const ruled = op.refusals.filter((r) => !op.errors.includes(r) && op.invariants?.[r] !== undefined);
  const runtime = op.refusals.filter((r) => !op.errors.includes(r) && r !== IDEMPOTENCY_CONFLICT && !ruled.includes(r));
  return {
    lines: [
      `brief ${name}`,
      "",
      `Write   src/${op.thing}/${op.verb}.ts, and nothing else.`,
      "",
      "Read",
      `  ${op.file}  the declaration: payload, answer, move, steps, errors`,
      `  generated/api/src/${op.thing}/${op.verb}.handler.ts  what the handler is given and may return`,
      `  generated/docs/${op.thing}/${op.verb}.md  the same, in words, with every refusal`,
      `  generated/docs/${op.thing}/index.md  the ${op.thing}: fields, machine, roles`,
      "",
      "Do",
      ...Object.values(op.steps).map((s) => `  run step ${s.name} (${s.type}) through steps.${s.name.split(".").pop()}(...)`),
      ...(Object.values(op.steps).some((s) => s.type === "database")
        ? ["  a database step wraps one call of Records (yield* Records, from @orthograph/language-effect): find, insert or update. A move changes the machine's state only; a field changes only when you write it, as steps.x(records.update(Thing, id, { field: value }))"]
        : []),
      ...(op.move ? [`  make the move with move(${op.move.to.length > 1 ? op.move.to.map((t) => `"${t}"`).join(" | ") : ""}): ${op.move.key}, emitting ${op.move.emits}`] : []),
      ...(declared.length ? [`  refuse with ${declared.join(", ")}, each after an Effect.logInfo saying why`] : []),
      ...(runtime.length ? [`  never refuse ${runtime.join(" or ")} yourself: the runtime does, before the handler runs`] : []),
      ...(ruled.length ? [`  never refuse ${ruled.join(" or ")} yourself: ${ruled.length === 1 ? "it belongs to a rule" : "each belongs to a rule"} (${[...new Set(ruled.map((r) => op.invariants![r]!))].join(", ")}), which the runtime checks after your handler has run${op.move ? " and made its move" : ""}, and before the commit. Your handler runs as if the call will succeed; when the rule is broken the call is refused and nothing is committed`] : []),
      "",
      "Don't touch",
      ...forbidden.map((f) => `  ${f}`),
      "",
      "Done when",
      `  ortho prove --env local passes, with ${name}'s 9 evals: ${EVALS.join(", ")}`,
      ...(calling.length ? [`  and the journeys that call it: ${calling.join(", ")}`, `  (to run one of them alone: ortho prove --only ${calling[0]})`] : [`  (no journey calls ${name} yet: coverage will fail until one does)`]),
      "  ortho check passes",
    ],
  };
};

export const Brief: BriefApi = { of, forbidden };
