import { OutputSchema } from "../../output-schema/service.ts";
import { Reading } from "../../reading/service.ts";
import { over } from "./over.ts";

/** The states a move starts in and ends in. */
const statesOf = (move: { readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string> }) => [...new Set([...move.from, ...move.to])];

/** machine.cli: a moving command's `--help` says which states it moves from and to. */
export const cli = over("machine.cli", ({ moves }, e) => moves.flatMap((op) => {
  const command = `${op.thing} ${op.verb}`;
  const help = e.cli[command];
  if (help === undefined) return [`\`${command} --help\` could not be run through the generated CLI`];
  const missing = statesOf(op.move).filter((s) => !Reading.hasName(help, s));
  return missing.length === 0 ? [] : [`\`${command} --help\` does not name the states it moves between (${missing.join(", ")} missing)`];
}));

/** Every string a tool listing states outside its prose: its keys and values in the schemas, annotations and metadata, with each `description` left out (a description is the author's words). */
const structuredStrings = (value: unknown): ReadonlyArray<string> =>
  typeof value === "string" ? [value]
  : Array.isArray(value) ? value.flatMap(structuredStrings)
  : typeof value === "object" && value !== null ? Object.entries(value).filter(([key]) => key !== "description").flatMap(([key, v]) => [key, ...structuredStrings(v)])
  : [];

const sameList = (value: unknown, want: ReadonlyArray<string>) => Array.isArray(value) && value.length === want.length && want.every((w, i) => value[i] === w);

/**
 * A tool's `_meta.move` is the move as the model has it: its key, the states it leaves and enters as lists of strings, the event it emits. A string where a list
 * belongs, a state the machine does not have, or another event is wrong, and so is a tool that sends none: a client cannot read the move from it.
 */
const metaMove = (op: { readonly name: string; readonly move: { readonly key: string; readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits: string } }, meta: unknown): ReadonlyArray<string> => {
  const move = typeof meta === "object" && meta !== null ? (meta as { readonly move?: unknown }).move : undefined;
  if (move === undefined) return [`${op.name} sends no _meta.move, so a client cannot read the move (${op.move.key}) from the tool`];
  if (typeof move !== "object" || move === null || Array.isArray(move)) return [`${op.name}'s _meta.move is not an object`];
  const m = move as Record<string, unknown>;
  return [
    ...(m["key"] === op.move.key ? [] : [`${op.name}'s _meta.move.key is ${JSON.stringify(m["key"])}, not "${op.move.key}"`]),
    ...(sameList(m["from"], op.move.from) ? [] : [`${op.name}'s _meta.move.from is ${JSON.stringify(m["from"])}, not the list ${JSON.stringify(op.move.from)}`]),
    ...(sameList(m["to"], op.move.to) ? [] : [`${op.name}'s _meta.move.to is ${JSON.stringify(m["to"])}, not the list ${JSON.stringify(op.move.to)}`]),
    ...(m["emits"] === op.move.emits ? [] : [`${op.name}'s _meta.move.emits is ${JSON.stringify(m["emits"])}, not "${op.move.emits}"`]),
  ];
};

/**
 * machine.mcp: a moving tool states the states it moves from and to in what the framework emits for it, not in the description the author wrote
 * (that is `operation.mcp`'s, and must equal the model's): in its input schema, its output schema (the `state` enum) or its annotations. An
 * answer that carries a `state` is also typed by an output schema.
 */
export const mcp = over("machine.mcp", ({ moves, machine }, e) => {
  if (e.mcp === undefined) return ["the MCP server's tools/list could not be read"];
  const tools = e.mcp;
  return moves.flatMap((op) => {
    const tool = tools.find((t) => t.name === op.name);
    if (tool === undefined) return [`tools/list has no tool ${op.name}`];
    const stated = new Set(structuredStrings({ ...tool, name: undefined }));
    const missing = statesOf(op.move).filter((s) => !stated.has(s));
    return [
      ...(missing.length === 0 ? [] : [`${op.name}'s schemas and annotations do not name the states it moves between (${missing.join(", ")} missing)`]),
      ...metaMove(op, tool._meta),
      ...(Object.keys(op.answer).includes("state") && tool.outputSchema === undefined ? [`${op.name} answers a state but offers no output schema typing it`] : []),
      ...(tool.outputSchema === undefined ? [] : OutputSchema.states({ model: e.model, op, schema: tool.outputSchema, spans: e.spans, files: e.files, states: machine.states })),
    ];
  });
});
