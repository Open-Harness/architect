// The oracle's schema half: a smallest valid example of a spec's schema, a judge for whether a value fits it, and the
// planted wrong values a check feeds a generated adapter to see that it notices. The judge reads the same spec the
// example came from, never the adapter's own types.
import { deref, type Json, type Node, type Spec } from "./spec.ts";

const FORMATS: Record<string, string> = {
  "date-time": "2026-11-22T10:00:00.000Z", date: "2026-11-22", uri: "https://example.test/x", "uri-reference": "https://example.test/x",
  url: "https://example.test/x", uuid: "0190f5d8-0000-7000-8000-000000000001", email: "ann@example.test",
};

export interface SampleOptions {
  /** Every documented property, not only the required ones. */
  readonly full?: boolean;
  /** How deep a recursive spec is followed before optional parts stop. */
  readonly depth?: number;
}

const typeOf = (node: Node): string | undefined => {
  const t = node["type"];
  const list = Array.isArray(t) ? t.filter((x: string) => x !== "null") : t === undefined ? [] : [t];
  if (list.length > 0) return list[0];
  if (node["properties"] !== undefined || node["additionalProperties"] !== undefined) return "object";
  if (node["items"] !== undefined) return "array";
  return undefined;
};

/** The merged view of an `allOf`, or the first non-null `oneOf`/`anyOf` alternative: the node a sample is made from. */
const flatten = (spec: Spec, schema: Node): Node => {
  const node = deref(spec, schema);
  if (Array.isArray(node["allOf"])) {
    const merged: Record<string, any> = { ...node, allOf: undefined };
    for (const part of node["allOf"].map((p: Node) => flatten(spec, p))) {
      // a property both parts describe must satisfy both, so it is kept as an `allOf` of the two
      const props: Record<string, Node> = { ...merged["properties"] };
      for (const [k, v] of Object.entries<Node>(part["properties"] ?? {})) props[k] = props[k] === undefined ? v : { allOf: [props[k], v] };
      merged["properties"] = props;
      merged["required"] = [...(merged["required"] ?? []), ...(part["required"] ?? [])];
      merged["type"] ??= part["type"];
      for (const k of ["enum", "items", "format"]) merged[k] ??= part[k];
    }
    return merged;
  }
  const alternatives = (node["oneOf"] ?? node["anyOf"]) as ReadonlyArray<Node> | undefined;
  if (alternatives !== undefined) return flatten(spec, alternatives.find((a) => deref(spec, a)["type"] !== "null") ?? alternatives[0]!);
  return node;
};

export const sample = (spec: Spec, schema: Node, options: SampleOptions = {}, depth = options.depth ?? 6): Json => {
  const node = flatten(spec, schema);
  if (node["const"] !== undefined) return node["const"];
  if (Array.isArray(node["enum"])) return node["enum"][0];
  if (node["example"] !== undefined && typeof node["example"] !== "object") return node["example"];
  switch (typeOf(node)) {
    case "string": return FORMATS[node["format"]] ?? "a".repeat(Math.max(1, node["minLength"] ?? 1));
    case "integer": return Math.max(1, node["minimum"] ?? 1);
    case "number": return Math.max(1, node["minimum"] ?? 1);
    case "boolean": return true;
    case "array": return depth <= 0 ? [] : [sample(spec, node["items"] ?? {}, options, depth - 1)];
    case "object": {
      const out: Record<string, Json> = {};
      const required: ReadonlyArray<string> = node["required"] ?? [];
      // a spec may require a name it never describes (GitHub's label requires `archived_at`): any value will do
      const described: Record<string, Node> = { ...Object.fromEntries(required.map((r) => [r, {}])), ...node["properties"] };
      for (const [name, child] of Object.entries<Node>(described)) {
        if (options.full === true ? depth <= 0 && !required.includes(name) : !required.includes(name)) continue;
        out[name] = sample(spec, child, options, depth - 1);
      }
      return out;
    }
    default: return "any";
  }
};

/** Why `value` doesn't fit `schema`, as at most a few lines, or none when it fits. */
export const problems = (spec: Spec, schema: Node, value: unknown, at = "$"): ReadonlyArray<string> => {
  const node = deref(spec, schema);
  if (Array.isArray(node["allOf"])) return node["allOf"].flatMap((part: Node) => problems(spec, part, value, at));
  const alternatives = (node["oneOf"] ?? node["anyOf"]) as ReadonlyArray<Node> | undefined;
  if (alternatives !== undefined) {
    const failures = alternatives.map((a) => problems(spec, a, value, at));
    return failures.some((f) => f.length === 0) ? [] : [`${at}: fits none of ${alternatives.length} alternatives`];
  }
  const kinds: ReadonlyArray<string> = Array.isArray(node["type"]) ? node["type"] : node["type"] === undefined ? [] : [node["type"]];
  if (value === null) return kinds.includes("null") || node["nullable"] === true || kinds.length === 0 ? [] : [`${at}: null`];
  const found = Array.isArray(value) ? "array" : typeof value === "number" ? (Number.isInteger(value) ? "integer" : "number") : typeof value;
  const fine = kinds.length === 0 || kinds.some((k) => k === found || (k === "number" && found === "integer"));
  if (!fine) return [`${at}: ${found}, not ${kinds.join("|")}`];
  if (Array.isArray(node["enum"]) && !node["enum"].includes(value)) return [`${at}: ${JSON.stringify(value)} not in the enum`];
  if (Array.isArray(value)) return node["items"] === undefined ? [] : value.flatMap((v, i) => problems(spec, node["items"], v, `${at}[${i}]`));
  if (found === "object") {
    const record = value as Record<string, unknown>;
    const missing = ((node["required"] ?? []) as ReadonlyArray<string>).filter((k) => !(k in record)).map((k) => `${at}.${k}: missing`);
    const wrong = Object.entries<Node>(node["properties"] ?? {}).flatMap(([k, child]) => (k in record ? problems(spec, child, record[k], `${at}.${k}`) : []));
    return [...missing, ...wrong];
  }
  return [];
};

export interface Plant { readonly label: string; readonly value: Json }

const clone = (v: Json): Json => JSON.parse(JSON.stringify(v)) as Json;
const wrongTypes = (v: Json): ReadonlyArray<Json> =>
  typeof v === "string" ? [1, null, [], {}] : typeof v === "number" ? ["1", null, true] : typeof v === "boolean" ? ["yes", null, 0] : Array.isArray(v) ? [{}, "x", null] : v === null ? [1] : ["x", [], null];

/**
 * Wrong copies of a valid `base`: the whole value of another type, then, for each required property at the top and one
 * level down (the first of an array, or an object's own), the property left out, and the property of other types. Each
 * is kept only if the judge agrees it no longer fits, so a plant that is secretly still valid is never used.
 */
export const plants = (spec: Spec, schema: Node, base: Json): ReadonlyArray<Plant> => {
  const made: Array<Plant> = [];
  const keep = (label: string, value: Json) => { if (problems(spec, schema, value).length > 0) made.push({ label, value }); };
  for (const [label, value] of [["a string", "text"], ["null", null], ["an array", []], ["a number", 7]] as const) if (!Array.isArray(base) || label !== "an array") keep(`the whole answer is ${label}`, value);
  const visit = (path: ReadonlyArray<string | number>, at: Json, node: Node) => {
    const flat = flatten(spec, node);
    if (typeof at !== "object" || at === null || Array.isArray(at)) return;
    for (const name of (flat["required"] ?? []) as ReadonlyArray<string>) {
      if (!(name in at)) continue;
      const drop = clone(base); const parent = walk(drop, path) as Record<string, Json>; delete parent[name];
      keep(`${[...path, name].join(".")} left out`, drop);
      for (const [i, other] of wrongTypes((at as Record<string, Json>)[name]!).entries()) {
        const swap = clone(base); (walk(swap, path) as Record<string, Json>)[name] = other;
        keep(`${[...path, name].join(".")} is ${JSON.stringify(other)} (${i})`, swap);
      }
      if (Array.isArray(flatten(spec, flat["properties"]?.[name] ?? {})["enum"])) {
        const swap = clone(base); (walk(swap, path) as Record<string, Json>)[name] = "not-in-the-enum";
        keep(`${[...path, name].join(".")} is not one of the enum`, swap);
      }
    }
  };
  const walk = (root: Json, path: ReadonlyArray<string | number>): Json => path.reduce<Json>((v, k) => (v as any)[k], root);
  const top = Array.isArray(base) ? [0] : [];
  visit(top, walk(base, top), Array.isArray(base) ? (flatten(spec, schema)["items"] ?? {}) : schema);
  const target = walk(base, top);
  const targetSchema = Array.isArray(base) ? (flatten(spec, schema)["items"] ?? {}) : schema;
  if (typeof target === "object" && target !== null && !Array.isArray(target)) {
    for (const [name, child] of Object.entries<Node>(flatten(spec, targetSchema)["properties"] ?? {})) {
      const inner = (target as Record<string, Json>)[name];
      if (inner === undefined) continue;
      const at = Array.isArray(inner) ? inner[0] : inner;
      const childPath = [...top, name, ...(Array.isArray(inner) ? [0] : [])];
      const childSchema = Array.isArray(inner) ? (flatten(spec, child)["items"] ?? {}) : child;
      if (at !== undefined) visit(childPath, at, childSchema);
    }
  }
  return made;
};
