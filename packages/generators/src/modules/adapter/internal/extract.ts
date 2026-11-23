// What a description says, read out of it: its operations (each with the fields a caller supplies and its success
// schema), its webhook events, and the schemas they refer to.
import { camel, nameParts } from "./names.ts";

// A node of the description, as its author spelled it.
export type Node = { readonly [key: string]: any };

export interface Description {
  readonly raw: Node;
  readonly swagger: boolean;
}

export interface Param { readonly name: string; readonly in: "path" | "query" | "body"; readonly required: boolean; readonly schema: Node }
export interface Op {
  readonly parts: ReadonlyArray<string>;
  readonly method: "get" | "post" | "put" | "patch" | "delete";
  readonly path: string;
  readonly params: ReadonlyArray<Param>;
  readonly success: { readonly status: number; readonly schema: Node } | null;
}
export interface Event { readonly name: string; readonly payloads: ReadonlyArray<Node> }

const METHODS = ["get", "post", "put", "patch", "delete"] as const;
/** What a parameter says about its own value, as a schema: the rest of its node is about the parameter. */
const ABOUT_THE_PARAMETER = new Set(["name", "in", "required", "description", "example", "examples", "allowEmptyValue", "collectionFormat", "style", "explode", "deprecated", "x-codeSamples"]);

const pointer = (raw: Node, ref: string): Node | undefined =>
  ref.replace(/^#\//, "").split("/").reduce<Node | undefined>((at, part) => at?.[part.replace(/~1/g, "/").replace(/~0/g, "~")], raw);

/** Follows `$ref`s to the node they name. */
export const deref = (d: Description, node: Node | undefined): Node => {
  let at = node;
  for (let hops = 0; at !== undefined && typeof at["$ref"] === "string" && hops < 50; hops += 1) at = pointer(d.raw, at["$ref"]);
  return at ?? {};
};

/** An object schema's properties, with an `allOf`'s parts merged in. */
const fieldsOf = (d: Description, schema: Node, seen = 0): { readonly properties: Node; readonly required: ReadonlyArray<string> } => {
  const node = deref(d, schema);
  const parts = seen < 8 && Array.isArray(node["allOf"]) ? (node["allOf"] as ReadonlyArray<Node>).map((p) => fieldsOf(d, p, seen + 1)) : [];
  return {
    properties: Object.assign({}, ...parts.map((p) => p.properties), node["properties"] ?? {}),
    required: [...parts.flatMap((p) => p.required), ...((node["required"] ?? []) as ReadonlyArray<string>)],
  };
};

const paramsOf = (d: Description, item: Node, op: Node): ReadonlyArray<Param> => {
  const found: Array<Param> = [];
  for (const p of [...(item["parameters"] ?? []), ...(op["parameters"] ?? [])].map((x: Node) => deref(d, x))) {
    // the token is the client's, sent as a bearer and never as a field
    if (p["in"] === "header" || p["name"] === "token") continue;
    if (p["in"] === "body") {
      const { properties, required } = fieldsOf(d, p["schema"] ?? {});
      for (const [name, schema] of Object.entries<Node>(properties)) found.push({ name, in: "body", required: required.includes(name), schema });
    } else {
      const where = p["in"] === "formData" ? "body" : p["in"] as Param["in"];
      const schema = p["schema"] ?? Object.fromEntries(Object.entries(p).filter(([k]) => !ABOUT_THE_PARAMETER.has(k)));
      found.push({ name: String(p["name"]), in: where, required: p["required"] === true || where === "path", schema });
    }
  }
  const body = op["requestBody"] === undefined ? undefined : deref(d, op["requestBody"])["content"]?.["application/json"]?.["schema"];
  if (body !== undefined) {
    const { properties, required } = fieldsOf(d, body);
    for (const [name, schema] of Object.entries<Node>(properties)) found.push({ name, in: "body", required: required.includes(name), schema });
  }
  return found.filter((p, i) => found.findIndex((q) => q.name === p.name) === i);
};

/** Every operation that has an `operationId`, in the description's order. */
export const operationsOf = (d: Description): ReadonlyArray<Op> => {
  const base = d.swagger ? String(d.raw["basePath"] ?? "").replace(/\/$/, "") : "";
  const found: Array<Op> = [];
  for (const [path, item] of Object.entries<Node>(d.raw["paths"] ?? {})) {
    for (const method of METHODS) {
      const op = item[method] as Node | undefined;
      if (op === undefined || typeof op["operationId"] !== "string") continue;
      const statuses = Object.keys(op["responses"] ?? {}).map(Number).filter((s) => s >= 200 && s < 300).sort((a, b) => a - b);
      const response = statuses[0] === undefined ? undefined : deref(d, op["responses"][String(statuses[0])]);
      const schema = response === undefined ? undefined : d.swagger ? response["schema"] : response["content"]?.["application/json"]?.["schema"];
      found.push({
        parts: nameParts(op["operationId"]), method, path: base + path, params: paramsOf(d, item, op),
        success: statuses[0] === undefined || schema === undefined ? null : { status: statuses[0], schema },
      });
    }
  }
  return found;
};

/** A webhook event is what GitHub calls one (`x-github.subcategory`); its payload is any one of the actions the description lists for it. */
export const eventsOf = (d: Description): ReadonlyArray<Event> => {
  const byEvent = new Map<string, Array<Node>>();
  for (const item of Object.values<Node>(d.raw["webhooks"] ?? {})) {
    const schema = item["post"]?.["requestBody"]?.["content"]?.["application/json"]?.["schema"] as Node | undefined;
    const event = item["post"]?.["x-github"]?.["subcategory"] as string | undefined;
    if (schema !== undefined && event !== undefined) byEvent.set(event, [...(byEvent.get(event) ?? []), schema]);
  }
  return [...byEvent].map(([key, payloads]) => ({ name: camel(key), payloads }));
};

/** Every schema the given ones refer to, by the `$ref` string the description writes, followed through each other. */
export const componentsOf = (d: Description, roots: ReadonlyArray<Node>): Readonly<Record<string, Node>> => {
  const table: Record<string, Node> = {};
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) { for (const n of node) visit(n); return; }
    if (typeof node !== "object" || node === null) return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") {
        const target = table[value] === undefined ? pointer(d.raw, value) : undefined;
        if (target !== undefined) { table[value] = target; visit(target); }
      } else visit(value);
    }
  };
  for (const root of roots) visit(root);
  return Object.fromEntries(Object.entries(table).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
};
