// src/<thing>/<verb>.ts: written once per operation, then the project's own. Never overwritten. It explains itself (K16):
// front matter citing each blueprint file, then a body laid out step by step.
import { Names } from "orthograph/server";
import type { Model, OperationModel } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";
import { callSteps, handlerTypeAt } from "./calls.ts";
import { body, branches } from "./body.ts";
import { handedIn, header } from "./header.ts";
import { refusalsOf } from "./words.ts";
import { camel, declarationAt, lines, local, scaffolded, toRoot } from "#modules/names/service.js";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** A model of one operation and no things: what the scaffold reads when it is given no model. */
const alone = (op: OperationModel): Model => ({ refusals: {}, things: {}, operations: { [op.name]: op } }) as unknown as Model;

/**
 * The answer field the runtime's minted id fills, once the model says the runtime mints it (M1.46 sets `mints` on a
 * creating operation: the answer's field holding the thing's id, else the payload's). Before that the handler mints its
 * own, and the scaffold leaves the field a blank.
 */
const mintedField = (model: Model, op: OperationModel) => {
  const mints = (op as OperationModel & { readonly mints?: string }).mints;
  // Only an answer field takes the id; a payload field named by `mints` is the caller's to give, and nothing to write.
  return mints && mints in op.answer && handedIn(model, op).mints ? mints : undefined;
};

/** What a handler of a calling operation is told about its operation, as comments. */
const said = (op: OperationModel) => [
  `Payload: ${Object.keys(op.payload).join(", ") || "none"}.`,
  `Answer: ${Object.keys(op.answer).join(", ") || "nothing"}.`,
  Object.keys(op.steps).length > 0 ? `Steps, each its own span: ${Object.keys(op.steps).map((k) => `steps.${k}(...)`).join(", ")}.` : "",
].filter(Boolean);

/**
 * An operation that calls an adapter: the call is wired by its payload's field names, and what is left to write is the one
 * thing only the app knows, which declared error each way the call can fail becomes. A call that is the whole operation
 * returns what the callable answered, so the answer is the callable's own.
 */
const calling = (model: Model, op: OperationModel, path: string): RenderedFile => {
  const steps = callSteps(op);
  const args = `[${Object.keys(op.payload).map((k) => (IDENTIFIER.test(k) ? `payload.${k}` : `payload[${JSON.stringify(k)}]`)).join(", ")}]`;
  const blank = `Handlers.blank("map how this call fails to the error it declares", "failure")`;
  const whole = steps.length === 1 && Object.keys(op.steps).length === 1;
  // The errors the call can be refused with are imported, so the one blank is filled with a bare `new <Error>(...)`; the header names them too.
  const errors = refusalsOf(model, op).filter((r) => r.giver === "yours");
  const comments = [...said(op), "What the call fails with is mapped to one of the errors the operation declares; anything else is a defect."];
  return {
    path,
    scaffold: true,
    content: lines(
      scaffolded(op.file),
      whole ? [] : `import { Effect } from "effect";`,
      `import { Handlers } from "${Names.pkg("language-effect")}";`,
      errors.map((r) => `import { ${r.name} } from "${declarationAt(path, r.file)}";`),
      `import type { Handler } from "${toRoot(path)}${handlerTypeAt(op)}";`,
      "",
      header(model, op),
      whole
        ? [`const ${local(camel(op.verb))}: Handler = (payload, { steps }) =>`, ...comments.map((s) => `  // ${s}`), `  steps.${steps[0]!.key}(${args}, ${blank});`]
        : [
          `const ${local(camel(op.verb))}: Handler = (payload, { steps }) =>`,
          "  Effect.gen(function* () {",
          ...comments.map((s) => `    // ${s}`),
          ...steps.map((s) => `    const ${s.key} = yield* steps.${s.key}(${args}, ${blank});`),
          `    return yield* Handlers.blank("this handler is not written yet");`,
          "  });",
        ],
      "",
      `export default ${local(camel(op.verb))};`,
    ),
  };
};

/**
 * An operation's handler scaffold. The model is how the scaffold reads the thing (its machine, errors, events and roles,
 * which are not on the operation); both callers pass it. Without one, the scaffold says only what the operation holds.
 */
export const renderHandlerScaffold = (op: OperationModel, path = `src/${op.thing}/${op.verb}.ts`, model: Model = alone(op)): RenderedFile => {
  if (callSteps(op).length > 0) return calling(model, op, path);
  const api = `${toRoot(path)}generated/api/src`;
  const minted = mintedField(model, op);
  const context = [...(Object.keys(op.steps).length > 0 ? ["steps"] : []), ...(op.move ? ["move"] : []), ...(minted ? ["id"] : [])];
  const declared = refusalsOf(model, op).filter((r) => r.giver === "yours").map((r) => r.name);
  const sections = body(model, op, minted);
  return {
    path,
    scaffold: true,
    content: lines(
      scaffolded(op.file),
      `import { Effect${branches(op) ? ", Match" : ""} } from "effect";`,
      `import { Handlers } from "${Names.pkg("language-effect")}";`,
      declared.length > 0 ? `import { Errors } from "${api}/index.ts";` : [],
      `import type { Handler${branches(op) ? ", Outcome" : ""} } from "${api}/${op.thing}/${op.verb}.handler.ts";`,
      "",
      declared.length > 0 ? [`const { ${declared.join(", ")} } = Errors.declared;`, ""] : [],
      header(model, op),
      `const ${local(camel(op.verb))}: Handler = (_payload, ${context.length === 0 ? "_context" : `{ ${context.join(", ")} }`}) =>`,
      "  Effect.gen(function* () {",
      sections.flatMap((s, i) => (i === 0 ? s : ["", ...s])),
      "  });",
      "",
      `export default ${local(camel(op.verb))};`,
    ),
  };
};
