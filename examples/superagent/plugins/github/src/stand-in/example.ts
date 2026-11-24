// Scaffolded from ortho new adapter. Yours from now on.
// The smallest value that fits one of GitHub's schemas, made from the schemas the plugin carries: an answer needs dozens of
// fields (a pull request has 42 required ones), and the stand-in sets only the ones it knows and lets the rest be this.
import { components } from "../spec/components.ts";

type Node = { readonly [key: string]: any };

const FORMATS: Readonly<Record<string, string>> = {
  "date-time": "2026-11-20T09:00:00Z", date: "2026-11-20", uri: "https://example.test/x", "uri-reference": "https://example.test/x",
  url: "https://example.test/x", uuid: "0190f5d8-0000-7000-8000-000000000001", email: "ann@example.test",
};

const resolve = (schema: Node): Node => (typeof schema["$ref"] === "string" ? resolve(components[schema["$ref"]] ?? {}) : schema);
const allowsNull = (node: Node): boolean => node["nullable"] === true || (Array.isArray(node["type"]) && node["type"].includes("null")) || node["type"] === "null";

/** The merged `allOf`, or the first alternative of a `oneOf` / `anyOf` that isn't null. */
const flat = (schema: Node): Node => {
  const node = resolve(schema);
  if (Array.isArray(node["allOf"])) {
    const parts = (node["allOf"] as ReadonlyArray<Node>).map(flat);
    return { ...Object.assign({}, ...parts), ...node, properties: Object.assign({}, ...parts.map((p) => p["properties"] ?? {}), node["properties"] ?? {}), required: [...parts.flatMap((p) => p["required"] ?? []), ...(node["required"] ?? [])] };
  }
  const alternatives = (node["oneOf"] ?? node["anyOf"]) as ReadonlyArray<Node> | undefined;
  return alternatives === undefined ? node : flat(alternatives.find((a) => resolve(a)["type"] !== "null") ?? alternatives[0]!);
};

export const example = (schema: Node, depth = 0): unknown => {
  const node = flat(schema);
  if (node["const"] !== undefined) return node["const"];
  if (Array.isArray(node["enum"])) return node["enum"][0];
  if (allowsNull(node) && node["type"] !== undefined) return null;
  const type = Array.isArray(node["type"]) ? node["type"].find((t: string) => t !== "null") : node["type"] ?? (node["properties"] === undefined ? undefined : "object");
  switch (type) {
    case "string": return FORMATS[node["format"]] ?? "x".repeat(Math.max(1, node["minLength"] ?? 1));
    case "integer": case "number": return Math.max(1, node["minimum"] ?? 1);
    case "boolean": return false;
    case "array": return (node["minItems"] ?? 0) > 0 && depth < 8 ? [example(node["items"] ?? {}, depth + 1)] : [];
    case "object": {
      if (depth > 8) return {};
      const required: ReadonlyArray<string> = node["required"] ?? [];
      return Object.fromEntries(required.map((name) => [name, example(node["properties"]?.[name] ?? {}, depth + 1)]));
    }
    default: return "x";
  }
};

/** An example of a component schema, with the fields the caller knows set over it. */
export const made = (name: string, over: Readonly<Record<string, unknown>>) => ({ ...(example({ $ref: `#/components/schemas/${name}` }) as Record<string, unknown>), ...over });
