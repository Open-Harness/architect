// The scaffold's body (K16 b, c): each step in order, a refusal block per declared error before the first writing step
// (else the last, else the move), one `Match.when` per outcome closed by `Match.exhaustive`, and the answer, with a note
// above each field the move's event needs and only the answer can give.
import type { Model, OperationModel } from "@orthograph/compiler";
import { an, label, refusalsOf } from "./words.ts";

const runner = (key: string) => (/^[A-Za-z_$][\w$]*$/.test(key) ? `steps.${key}` : `steps[${JSON.stringify(key)}]`);
const property = (key: string) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key));
const blank = (what: string, type = "") => `Handlers.blank${type ? `<${type}>` : ""}(${JSON.stringify(what)})`;

const stepBlock = (model: Model, op: OperationModel, key: string): ReadonlyArray<string> => {
  const step = op.steps[key]!;
  const store = step.type === "database" ? (step.writes?.length ? step.writes.join(", ") : model.things[op.thing]?.store) : undefined;
  return [
    `    // Step ${key}: ${step.type}${store ? `, in the store ${store}` : ""}, span ${step.name}.`,
    `    yield* ${runner(key)}(${blank(`${key}: the work this step does`)});${step.optional ? " // optional: may be skipped" : ""}`,
  ];
};

const refusalBlocks = (model: Model, op: OperationModel): ReadonlyArray<ReadonlyArray<string>> =>
  refusalsOf(model, op).filter((r) => r.giver === "yours").map((r) => {
    const fields = r.fieldModels;
    const made = Object.keys(fields).length === 0
      ? [`      return yield* new ${r.name}({});`]
      : [
        `      return yield* new ${r.name}({`,
        ...Object.entries(fields).map(([k, f]) => `        ${property(k)}: yield* ${blank(`${r.name}.${k}, ${an(label(f))}`)},`),
        "      });",
      ];
    return [
      `    // ${r.name}: exit ${r.exit}, ${r.code}.`,
      `    if (yield* ${blank(`refuse ${r.name} when?`, "boolean")}) {`,
      `      yield* Effect.logInfo(yield* ${blank(`why ${r.name} was refused`)});`,
      ...made,
      "    }",
    ];
  });

/** What can follow from a state: every move whose `from` holds it. */
const nextFrom = (model: Model, op: OperationModel, state: string) => {
  const moves = Object.entries(model.things[op.thing]?.machine?.moves ?? {}).filter(([, m]) => m.from.includes(state));
  return moves.length === 0 ? "nothing more" : moves.map(([k, m]) => `${k} (to ${m.to.join(" or ")})`).join(", ");
};

const moveBlock = (model: Model, op: OperationModel): ReadonlyArray<string> => {
  const move = op.move;
  if (!move) return [];
  const from = move.from.length ? `, from ${move.from.join(" or ")}` : "";
  if (move.to.length === 1) return [`    // The move ${move.key}${from}, to ${move.to[0]}.`, "    yield* move();"];
  return [
    `    // The move ${move.key}${from}: one branch per outcome. A new outcome won't compile until it has its branch.`,
    `    const outcome = yield* ${blank(`where ${move.key} ends: ${move.to.join(" or ")}`, "Outcome")};`,
    "    yield* Match.value(outcome).pipe(",
    ...move.to.flatMap((to) => [
      `      // To ${to}. From there the ${op.thing} can: ${nextFrom(model, op, to)}.`,
      `      Match.when(${JSON.stringify(to)}, () => move(${JSON.stringify(to)})),`,
    ]),
    "      Match.exhaustive,",
    "    );",
  ];
};

const answerBlock = (model: Model, op: OperationModel, minted: string | undefined): ReadonlyArray<string> => {
  const fields = Object.entries(op.answer);
  if (fields.length === 0) return ["    return {};"];
  const event = op.move ? model.things[op.thing]?.events[op.move.emits] : undefined;
  const own = model.things[op.thing]?.fields ?? {};
  return [
    "    return {",
    ...fields.flatMap(([k, f]) => [
      ...(event && k in event && !(k in own) && !(k in op.payload) ? [`      // ${op.move!.emits} needs ${k}, and only the answer can give it.`] : []),
      `      ${property(k)}: ${k === minted ? "id" : `yield* ${blank(`${k}, ${an(label(f))}`)}`},`,
    ]),
    "    };",
  ];
};

/** The body's sections in order, each a list of lines; the scaffold puts an empty line between them. */
export const body = (model: Model, op: OperationModel, minted: string | undefined): ReadonlyArray<ReadonlyArray<string>> => {
  const keys = Object.keys(op.steps);
  const writing = keys.findIndex((k) => (op.steps[k]!.writes?.length ?? 0) > 0);
  const at = writing >= 0 ? writing : keys.length > 0 ? keys.length - 1 : keys.length;
  const steps = keys.map((k) => stepBlock(model, op, k));
  return [...steps.slice(0, at), ...refusalBlocks(model, op), ...steps.slice(at), moveBlock(model, op), answerBlock(model, op, minted)]
    .filter((s) => s.length > 0);
};

/** Whether the body uses `Match` and `Outcome`: a move with more than one outcome. */
export const branches = (op: OperationModel) => (op.move?.to.length ?? 0) > 1;
