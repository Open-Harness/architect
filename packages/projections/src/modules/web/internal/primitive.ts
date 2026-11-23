// generated/web/<thing>/<verb>.ts: the piece's UI SDK primitive, framework-free. Every piece is this short because @orthograph/web holds the rest.
import type { Model, OperationModel } from "@orthograph/compiler";
import { camel, lines, pascal } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";
import { comment, inputsOf, issues, kindOf, payloadOf, reloadsOn, subjectOf } from "./shape.ts";

const list = (names: ReadonlyArray<string>) => `[${names.map((n) => JSON.stringify(n)).join(", ")}]`;

const answerType = (op: OperationModel) => `${pascal(op.thing)}${pascal(op.verb)}Answer`;

const header = (op: OperationModel, verb: string) => [
  `// Generated from ${op.file}. Do not edit.`,
  `import { definePrimitive } from "@ui-sdk/core";`,
  `import { piece, type PieceOptions } from "@orthograph/web";`,
  `import type { options } from "../../actions/${op.thing}/${verb}.ts";`,
  "",
  `/** What ${op.name} answers. */`,
  `export type ${answerType(op)} = Awaited<ReturnType<ReturnType<typeof options>["run"]>>;`,
  "",
];

/** A read: its payload fields are its options, and it loads when it appears, when they change and when a write finishes on its things. */
const read = (model: Model, op: OperationModel): ReadonlyArray<string> => {
  const fields = payloadOf(op).map(([key]) => key);
  return [
    `/** ${comment(op.description)} */`,
    `export const ${camel(op.thing)}${pascal(op.verb)} = definePrimitive({`,
    `  name: ${JSON.stringify(`${op.thing}-${op.verb}`)},`,
    `  options: { ...piece.readOptions${fields.map((f) => `, ${f}: "string"`).join("")} },`,
    `  state: (_: PieceOptions<${answerType(op)}>) => piece.readState<${answerType(op)}>(),`,
    `  api: (context) => piece.readApi(context, { fields: ${list(fields)}, reloadsOn: ${list(reloadsOn(model, op))} }),`,
    `  slots: (slot) => piece.readSlots(slot),`,
    `  agent: { actions: ["reload"] },`,
    `});`,
  ];
};

/** A move or a write: the form's fields are read at the press; the ids of the payload are options the page gives. */
const write = (op: OperationModel): ReadonlyArray<string> => {
  const subject = subjectOf(op);
  const optional = inputsOf(op).filter(([, f]) => f.optional === true).map(([key]) => key);
  return [
    `/** ${comment(op.description)} */`,
    `export const ${camel(op.thing)}${pascal(op.verb)} = definePrimitive({`,
    `  name: ${JSON.stringify(`${op.thing}-${op.verb}`)},`,
    `  options: { ...piece.options${subject.map((f) => `, ${f}: "string"`).join("")} },`,
    `  state: (_: PieceOptions<${answerType(op)}>) => piece.state<${answerType(op)}>(),`,
    `  api: (context) => piece.api(context, { fields: ${list(inputsOf(op).map(([key]) => key))}${optional.length === 0 ? "" : `, optional: ${list(optional)}`}${subject.length === 0 ? "" : `, subject: ${list(subject)}`} }),`,
    `  slots: (slot) => piece.slots(slot),`,
    `  agent: { actions: ["submit"]${issues(op) ? ", secret: true" : ""} },`,
    `});`,
  ];
};

export const renderPrimitive = (model: Model, op: OperationModel): RenderedFile => ({
  path: `generated/web/${op.thing}/${op.verb}.ts`,
  scaffold: false,
  content: lines(header(op, op.verb), kindOf(op) === "read" ? read(model, op) : write(op)),
});
