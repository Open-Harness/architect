// generated/actions: one module per operation, K29 section 3.1's shape. Every field is the model's; `run` is one `host.call` of the SDK's call.
import { Effect } from "effect";
import type { Model, OperationModel } from "@orthograph/compiler";
import { camel, lines, member, pascal } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";
import { UnknownRefusal } from "../types.ts";

/** `readOnly` is true when the operation can write nothing: no `move`, and every step a `load` (no steps counts). WEB-actions-projection call 1. */
export const readsOnly = (op: OperationModel): boolean => !op.move && Object.keys(op.steps).every((step) => step === "load");

/** A sentence inside a doc comment: its own comment end would close the comment early. */
const comment = (text: string) => text.replace(/\*\//g, "*\\/").replace(/\s*\n\s*/g, " ");

const one = (op: OperationModel, client: string, errors: ReadonlyArray<string>): RenderedFile => {
  const call = `Sdk.${camel(op.thing)}.${camel(op.verb)}`;
  return {
    path: `generated/actions/${op.thing}/${op.verb}.ts`,
    scaffold: false,
    content: lines(
      `// Generated from ${op.file}. Do not edit.`,
      `import type { Effect } from "effect";`,
      `import type { PayloadOf } from "orthograph";`,
      `import type { ActionHost, ActionOptions } from "orthograph/actions";`,
      `import type * as Sdk from "../../sdk/src/index.ts";`,
      `import { declaration } from "../../api/src/${op.thing}/${op.verb}.ts";`,
      "",
      `type Payload = PayloadOf<typeof declaration>;`,
      `type Answer = Effect.Success<ReturnType<typeof ${call}>>;`,
      "",
      `/** ${comment(op.description)} */`,
      `export const options = (host: ActionHost<Sdk.${client}["Service"]>): ActionOptions<Payload, Answer> => ({`,
      `  name: ${JSON.stringify(op.name)},`,
      `  description: ${JSON.stringify(op.description)},`,
      `  schema: declaration.payloadSchema,`,
      `  readOnly: ${readsOnly(op)},`,
      `  needsApproval: ${op.needsApproval === true},`,
      `  agentTool: ${op.agentTool},`,
      `  errors: { ${errors.join(", ")} },`,
      `  run: (args, ctx) => host.call((client) => client${member(op.thing)}${member(op.verb)}({ payload: args }), ctx),`,
      `});`,
    ),
  };
};

/** Each refusal an operation declares, with its code from the model; one the model has no code for fails the render. */
const errorsOf = (model: Model, op: OperationModel): Effect.Effect<ReadonlyArray<string>, UnknownRefusal> =>
  Effect.forEach(op.refusals, (tag) => {
    const code = model.refusals[tag];
    return code === undefined ? Effect.fail(new UnknownRefusal({ message: `${op.file}: ${op.name} declares the refusal ${tag}, and the model has no code for it` })) : Effect.succeed(`${tag}: ${JSON.stringify(code)}`);
  });

export const renderActions = (model: Model, name: string): Effect.Effect<ReadonlyArray<RenderedFile>, UnknownRefusal> =>
  Effect.forEach(Object.values(model.operations), (op) => Effect.map(errorsOf(model, op), (errors) => one(op, pascal(name), errors)));
