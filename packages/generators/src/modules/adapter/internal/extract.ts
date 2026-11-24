// What a description says, read out of it: its operations (each with the fields a caller supplies, how its token is sent
// and its success schema), its webhook events, and the schemas they refer to.
import { camel, nameParts } from "./names.ts";

// A node of the description, as its author spelled it.
export type Node = { readonly [key: string]: any };

export interface Description {
  readonly raw: Node;
  readonly swagger: boolean;
}

export interface Param { readonly name: string; readonly in: "path" | "query" | "header" | "body"; readonly required: boolean; readonly schema: Node }
/** How a call sends the client's token: as `Authorization: Bearer`, in the header an `apiKey` scheme names, or not at all (`security: []`). */
export type Auth = "bearer" | "none" | { readonly header: string };
/** A request body of alternatives (`oneOf` / `anyOf`): its fields are any alternative's, and the input's body is judged against it whole. */
export interface Body { readonly schema: Node; readonly required: boolean }
export interface Op {
  readonly id: string;
  readonly parts: ReadonlyArray<string>;
  readonly method: "get" | "post" | "put" | "patch" | "delete";
  readonly path: string;
  readonly params: ReadonlyArray<Param>;
  readonly body: Body | null;
  readonly auth: Auth;
  /** One per documented 2xx status; a null schema is a status with no body (204). */
  readonly successes: ReadonlyArray<{ readonly status: number; readonly schema: Node | null }>;
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

/** The header a call's caller may give, else the client makes a fresh one: so it is never required. */
const IDEMPOTENCY_KEY = /^idempotency-key$/i;

/**
 * A body schema's fields. Of alternatives (`oneOf` / `anyOf`), every field any of them or the schema itself has, none required and each
 * judged only with the whole body (one alternative's `type: individual` is another's misfit); otherwise its properties.
 */
const bodyOf = (d: Description, schema: Node, required: boolean): { readonly fields: ReadonlyArray<Param>; readonly body: Body | null } => {
  const node = deref(d, schema);
  const alternatives = (node["oneOf"] ?? node["anyOf"]) as ReadonlyArray<Node> | undefined;
  if (Array.isArray(alternatives)) {
    // the schema's own fields (its properties, an allOf's) are common to every alternative
    const names = [...new Set([node, ...alternatives].flatMap((a) => Object.keys(fieldsOf(d, a).properties)))];
    return { fields: names.map((name) => ({ name, in: "body", required: false, schema: {} })), body: { schema, required } };
  }
  const { properties, required: needed } = fieldsOf(d, schema);
  return { fields: Object.entries<Node>(properties).map(([name, s]) => ({ name, in: "body", required: needed.includes(name), schema: s })), body: null };
};

const paramsOf = (d: Description, item: Node, op: Node, auth: Auth): { readonly params: ReadonlyArray<Param>; readonly body: Body | null } => {
  const found: Array<Param> = [];
  let body: Body | null = null;
  const take = (b: ReturnType<typeof bodyOf>) => { found.push(...b.fields); body = b.body ?? body; };
  const credential = auth === "none" ? undefined : auth === "bearer" ? "authorization" : auth.header.toLowerCase();
  for (const p of [...(item["parameters"] ?? []), ...(op["parameters"] ?? [])].map((x: Node) => deref(d, x))) {
    // the token is the client's credential, never a field (Slack declares it as a header)
    // (a path parameter that happens to be called `token` is a field like any other)
    // and so is a header the spec also declares where the credential goes (`Authorization`, an apiKey's own)
    if ((p["name"] === "token" && p["in"] !== "path") || p["in"] === "cookie" || (p["in"] === "header" && String(p["name"]).toLowerCase() === credential)) continue;
    if (p["in"] === "body") take(bodyOf(d, p["schema"] ?? {}, p["required"] === true));
    else {
      const where = p["in"] === "formData" ? "body" : p["in"] as Param["in"];
      const schema = p["schema"] ?? Object.fromEntries(Object.entries(p).filter(([k]) => !ABOUT_THE_PARAMETER.has(k)));
      const name = String(p["name"]);
      const required = (p["required"] === true || where === "path") && !(where === "header" && IDEMPOTENCY_KEY.test(name));
      found.push({ name, in: where, required, schema });
    }
  }
  const requestBody = op["requestBody"] === undefined ? undefined : deref(d, op["requestBody"]);
  const schema = requestBody?.["content"]?.["application/json"]?.["schema"] as Node | undefined;
  if (schema !== undefined) take(bodyOf(d, schema, requestBody?.["required"] === true));
  // an operation's own parameter overrides the path item's of the same name and place
  const merged: Array<Param> = [];
  for (const p of found) {
    const at = merged.findIndex((q) => q.name === p.name && q.in === p.in);
    if (at >= 0) merged[at] = p;
    else merged.push(p);
  }
  return { params: merged, body };
};

/**
 * The operation's security, else the document's. An `apiKey` scheme `in: header` (OpenAPI's `securitySchemes`, Swagger's
 * `securityDefinitions`) names the header; `[]` sends no credential; any other scheme, or none declared, is a bearer.
 */
const authOf = (d: Description, op: Node): Auth => {
  const security = op["security"] ?? d.raw["security"];
  if (!Array.isArray(security)) return "bearer";
  const first = (security as ReadonlyArray<Node>).find((r) => typeof r === "object" && r !== null && Object.keys(r).length > 0);
  if (first === undefined) return "none";
  const schemes: Node = (d.swagger ? d.raw["securityDefinitions"] : d.raw["components"]?.["securitySchemes"]) ?? {};
  const scheme = deref(d, schemes[Object.keys(first)[0]!]);
  return scheme["type"] === "apiKey" && scheme["in"] === "header" && typeof scheme["name"] === "string" ? { header: scheme["name"] } : "bearer";
};

/** The method's word on a collection (the path ends in a fixed part) and on an item (it ends in a `{parameter}`). */
const WORDS = {
  collection: { get: "list", post: "create", put: "update", patch: "update", delete: "delete" },
  item: { get: "get", post: "create", put: "update", patch: "update", delete: "delete" },
} as const;

/** A call with no `operationId`: its path's fixed parts, camel-cased, then its method's word (`GET /widgets/{id}/spare_parts` is `widgets.spareParts.list`). */
const pathName = (method: Op["method"], path: string): ReadonlyArray<string> => {
  const parts = path.split("/").filter((p) => p !== "");
  const onItem = (parts[parts.length - 1] ?? "").includes("{");
  return [...parts.filter((p) => !p.includes("{")).map(camel), WORDS[onItem ? "item" : "collection"][method]];
};

/** Every operation, in the description's order, named by its `operationId` or else by its method and path. */
export const operationsOf = (d: Description): ReadonlyArray<Op> => {
  const base = d.swagger ? String(d.raw["basePath"] ?? "").replace(/\/$/, "") : "";
  const found: Array<Op> = [];
  for (const [path, item] of Object.entries<Node>(d.raw["paths"] ?? {})) {
    for (const method of METHODS) {
      const op = item[method] as Node | undefined;
      if (op === undefined) continue;
      const statuses = Object.keys(op["responses"] ?? {}).map(Number).filter((s) => s >= 200 && s < 300).sort((a, b) => a - b);
      const successes = statuses.map((status) => {
        const response = deref(d, op["responses"][String(status)]);
        const schema: Node | undefined = d.swagger ? response["schema"] : response["content"]?.["application/json"]?.["schema"];
        return { status, schema: schema ?? null };
      });
      const id = op["operationId"];
      const auth = authOf(d, op);
      found.push({
        id: typeof id === "string" ? id : `${method.toUpperCase()} ${path}`,
        parts: typeof id === "string" ? nameParts(id) : pathName(method, path),
        method, path: base + path, ...paramsOf(d, item, op, auth), auth, successes,
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
