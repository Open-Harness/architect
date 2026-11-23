import { Reading } from "../../reading/service.ts";
import { SdkTypes } from "../../sdk-types/service.ts";
import { operationsOf, over, typeName } from "./over.ts";

/** thing.model: the thing is in the model with its description, and every field with its value type; a reference or named value says which. */
export const model = over("thing.model", (thing) => [
  ...((thing.description ?? "").trim() === "" ? ["it has no description"] : []),
  ...(Object.keys(thing.fields).length === 0 ? ["it has no fields"] : []),
  ...Object.entries(thing.fields).flatMap(([name, field]) => [
    ...(typeof field.value?.type === "string" ? [] : [`field ${name} has no value type`]),
    ...(field.visibility !== undefined && JSON.stringify(field.visibility) === undefined ? [`field ${name} has a visibility the model cannot write down`] : []),
  ]),
]);

/** thing.api: every endpoint of the thing's operations types its payload and answer from the declaration's own fields. */
export const api = over("thing.api", (thing, e) => operationsOf(e, thing.name).flatMap((op) => {
  const path = `generated/api/src/${op.thing}/${op.verb}.ts`;
  const source = e.files[path];
  if (source === undefined) return [`${path} was not generated`];
  const code = Reading.code(source);
  return [
    ...(code.includes("payload: declaration.payloadSchema") ? [] : [`${path} does not type its payload from the declaration`]),
    ...(code.includes("wireStruct(declaration.answer") ? [] : [`${path} does not type its answer from the declaration`]),
  ];
}));

/** thing.server: the server decodes each answer of the thing's operations against the declaration (prove's `answer shape`), and the calls ran. */
export const server = over("thing.server", (thing, e) => {
  const ops = operationsOf(e, thing.name);
  return [
    ...(ops.length === 0 ? [`no operation acts on ${thing.name}`] : []),
    ...ops.flatMap((op) => Reading.proved(e.prove, `${op.name} answer shape`)),
  ];
});

/**
 * thing.sdk: the SDK exports a type for the thing (`Link`) whose every member resolves, in the TypeScript checker, to what the model says the field is (`SdkTypes`):
 * a string for an id or text, a number or bigint for a uint, a boolean for a boolean, a real value for a named schema, optional exactly when a call may leave it out.
 */
export const sdk = over("thing.sdk", (thing, e) => {
  // An interface, or an alias of an object type: the type a caller writes, with a member for each field.
  const declared = Object.entries(e.files).filter(([path]) => path.startsWith("generated/sdk/")).flatMap(([path, text]) =>
    Reading.exportedTypes(text).filter((t) => t.name === thing.identifier).map((t) => ({ path, ...t }))).find((t) => t.members.length > 0);
  if (declared === undefined) return [`the SDK exports no type ${thing.identifier}: a caller cannot name a ${thing.name}`];
  return SdkTypes.fieldProblems({ files: e.files, model: e.model, thing, path: declared.path });
});

/** thing.telemetry: a thing's public fields appear on its operations' spans as `payload.*` and `answer.*` (text only when `traced`), and no others do. */
export const telemetry = over("thing.telemetry", (thing, e) => {
  if (e.spans === undefined) return ["no spans were read from the prove run"];
  const spans = operationsOf(e, thing.name).flatMap((op) => Reading.spansNamed(e.spans ?? [], op.name).map((span) => ({ op, span })));
  return operationsOf(e, thing.name).flatMap((op) => {
    const mine = spans.filter((s) => s.op.name === op.name).map((s) => s.span);
    if (mine.length === 0) return [`no span of ${op.name} was recorded`];
    return (["payload", "answer"] as const).flatMap((side) => {
      const fields = Object.entries(op[side]);
      const shown = new Set(fields.filter(([, f]) => f.visibility === undefined && (f.value.type !== "text" || f.traced === true)).map(([name]) => `${side}.${name}`));
      const seen = new Set(mine.flatMap((s) => Object.keys(s.attrs)).filter((k) => k.startsWith(`${side}.`)));
      return [
        ...[...shown].filter((k) => !seen.has(k)).map((k) => `${op.name}'s spans never carry ${k} (public, ${typeName(op[side][k.slice(side.length + 1)]!)})`),
        ...[...seen].filter((k) => !shown.has(k)).map((k) => `${op.name}'s span carries ${k}, which the thing does not show (private, secret or text not marked traced, or not declared)`),
      ];
    });
  });
});
