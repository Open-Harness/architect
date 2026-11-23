// Generated from PostHog API 1.0.0. Do not edit.
// Whether a JSON value fits a schema the way an OpenAPI description writes it: types, enums, required parts, items,
// `allOf` / `oneOf` / `anyOf`, string patterns, formats and lengths, number bounds. The value is judged and never changed,
// so what decodes is the JSON that went in. Names the first few things that don't fit.
import { Effect, Option, Schema } from "effect";
import type { Components, JsonSchema } from "./types.ts";

const FORMATS: Readonly<Record<string, RegExp>> = {
  "date-time": /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:?\d{2})$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  uuid: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  email: /^[^@\s]+@[^@\s]+$/,
  uri: /^[A-Za-z][A-Za-z0-9+.-]*:/,
  url: /^[A-Za-z][A-Za-z0-9+.-]*:/,
};

const patterns = new Map<string, RegExp | undefined>();
const compile = (source: string, flags: string) => Option.getOrUndefined(Effect.runSync(Effect.option(Effect.try(() => new RegExp(source, flags)))));
/** A pattern as the spec writes it (a regular expression), compiled once; one JavaScript can't read is not enforced. */
const patternOf = (source: string): RegExp | undefined => {
  if (!patterns.has(source)) patterns.set(source, compile(source, "u") ?? compile(source, ""));
  return patterns.get(source);
};

/** Follows `$ref`s into the components table until a schema. */
const resolve = (components: Components, schema: JsonSchema): JsonSchema => {
  let at = schema;
  for (let hops = 0; typeof at["$ref"] === "string" && hops < 50; hops += 1) at = components[at["$ref"]] ?? {};
  return at;
};

const kindOf = (value: unknown): string => (Array.isArray(value) ? "array" : value === null ? "null" : typeof value === "number" ? (Number.isInteger(value) ? "integer" : "number") : typeof value);

const stringProblems = (node: JsonSchema, value: string, at: string): ReadonlyArray<string> => {
  const found: Array<string> = [];
  const length = [...value].length;
  if (typeof node["minLength"] === "number" && length < node["minLength"]) found.push(`${at}: shorter than ${node["minLength"]}`);
  if (typeof node["maxLength"] === "number" && length > node["maxLength"]) found.push(`${at}: longer than ${node["maxLength"]}`);
  if (typeof node["pattern"] === "string") {
    const pattern = patternOf(node["pattern"]);
    if (pattern !== undefined && !pattern.test(value)) found.push(`${at}: doesn't match ${node["pattern"]}`);
  }
  const format = typeof node["format"] === "string" ? FORMATS[node["format"]] : undefined;
  if (format !== undefined && !format.test(value)) found.push(`${at}: not a ${String(node["format"])}`);
  return found;
};

/** Why `value` doesn't fit `schema`, as a few lines; none when it fits. */
export const problems = (components: Components, schema: JsonSchema, value: unknown, at = "$"): ReadonlyArray<string> => {
  const node = resolve(components, schema);
  const found: Array<string> = [];
  if (Array.isArray(node["allOf"])) for (const part of node["allOf"] as ReadonlyArray<JsonSchema>) found.push(...problems(components, part, value, at));
  const alternatives = (node["oneOf"] ?? node["anyOf"]) as ReadonlyArray<JsonSchema> | undefined;
  if (alternatives !== undefined) {
    const failures = alternatives.map((a) => problems(components, a, value, at));
    if (!failures.some((f) => f.length === 0)) found.push(`${at}: fits none of ${alternatives.length} alternatives${failures[0]?.[0] === undefined ? "" : ` (the first: ${failures[0][0]})`}`);
  }
  const declared: ReadonlyArray<string> = Array.isArray(node["type"]) ? node["type"] as ReadonlyArray<string> : typeof node["type"] === "string" ? [node["type"]] : [];
  // GitHub's label says `type: [null]` beside an `allOf` of a user: the value is that user or null, so the type alone isn't the rule.
  const kinds = declared.length === 1 && declared[0] === "null" && (node["allOf"] !== undefined || node["properties"] !== undefined) ? [] : declared;
  if (value === null) return kinds.includes("null") || node["nullable"] === true || kinds.length === 0 ? found : [...found, `${at}: null`];
  const kind = kindOf(value);
  if (kinds.length > 0 && !kinds.some((k) => k === kind || (k === "number" && kind === "integer"))) return [...found, `${at}: ${kind}, not ${kinds.join("|")}`];
  if (Array.isArray(node["enum"]) && !node["enum"].some((e) => e === value)) found.push(`${at}: ${JSON.stringify(value)} not in the enum`);
  if (node["const"] !== undefined && node["const"] !== value) found.push(`${at}: not ${JSON.stringify(node["const"])}`);
  if (typeof value === "string") found.push(...stringProblems(node, value, at));
  if (typeof value === "number") {
    if (typeof node["minimum"] === "number" && value < node["minimum"]) found.push(`${at}: under ${node["minimum"]}`);
    if (typeof node["maximum"] === "number" && value > node["maximum"]) found.push(`${at}: over ${node["maximum"]}`);
  }
  if (Array.isArray(value)) {
    if (typeof node["minItems"] === "number" && value.length < node["minItems"]) found.push(`${at}: fewer than ${node["minItems"]} items`);
    if (typeof node["maxItems"] === "number" && value.length > node["maxItems"]) found.push(`${at}: more than ${node["maxItems"]} items`);
    if (node["items"] !== undefined) value.forEach((v, i) => found.push(...problems(components, node["items"] as JsonSchema, v, `${at}[${i}]`)));
  } else if (kind === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    for (const k of (node["required"] ?? []) as ReadonlyArray<string>) if (!(k in record)) found.push(`${at}.${k}: missing`);
    for (const [k, child] of Object.entries((node["properties"] ?? {}) as Readonly<Record<string, JsonSchema>>)) if (k in record) found.push(...problems(components, child, record[k], `${at}.${k}`));
  }
  return found.slice(0, 5);
};

/** An Effect schema of whatever fits `schema`: it decodes a value to itself, or says why not. */
export const schemaOf = (components: Components, schema: JsonSchema): Schema.Codec<unknown> =>
  Schema.Unknown.pipe(Schema.check(Schema.makeFilter((value: unknown) => {
    const found = problems(components, schema, value);
    return found.length === 0 ? true : found.join("; ");
  })));
