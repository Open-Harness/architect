// The registry: every action once, in order, with its flags and a JSON input schema.
import { Data, Effect, Schema } from "effect";
import type { Action, ActionRegistry, ListedAction } from "../types.ts";

const inputSchemaOf = (schema: Schema.Codec<any, unknown>): Readonly<Record<string, unknown>> => {
  const standard = Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(schema));
  return JSON.parse(JSON.stringify(standard["~standard"].jsonSchema.input({ target: "draft-2020-12" }))) as Record<string, unknown>;
};

const listed = (action: Action<any, any>): ListedAction => ({
  name: action.name,
  description: action.description,
  readOnly: action.readOnly,
  needsApproval: action.needsApproval,
  agentTool: action.agentTool,
  inputSchema: inputSchemaOf(action.schema),
});

class DuplicateAction extends Data.TaggedError("DuplicateAction")<{ readonly name: string }> {}

/** Registering two actions of one name is a mistake in the host's code: it stops at the registry, before anything is served. */
export const registry = (actions: ReadonlyArray<Action<any, any>>): ActionRegistry => {
  const own = [...actions];
  const byName = new Map(own.map((action) => [action.name, action] as const));
  // `registry` is synchronous and a host's mistake must stop it before anything is served, so the failure is run with
  // `runSync`, which raises it: the one deliberate raise in this module, a named typed failure and not a defect.
  const duplicate = own.find((action, index) => own.findIndex((other) => other.name === action.name) !== index);
  if (duplicate !== undefined) return Effect.runSync(Effect.fail(new DuplicateAction({ name: duplicate.name })));
  const rows = own.map(listed);
  return { list: () => rows.map((row) => structuredClone(row)), get: (name) => byName.get(name) };
};
