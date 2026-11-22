// The registry: every action once, in order, with its flags and a JSON input schema.
import { Effect, Schema } from "effect";
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

/** Registering two actions of one name is a mistake in the host's code: it stops at the registry, before anything is served. */
export const registry = (actions: ReadonlyArray<Action<any, any>>): ActionRegistry => {
  const own = [...actions];
  const byName = new Map(own.map((action) => [action.name, action] as const));
  if (byName.size !== own.length) return Effect.runSync(Effect.die(new Error("Two actions are registered under one name.")));
  const rows = own.map(listed);
  return { list: () => rows.map((row) => structuredClone(row)), get: (name) => byName.get(name) };
};
