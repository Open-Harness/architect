// The oracle: an independent reading of a published API description. Every expected name, request and shape a check
// judges comes from here, never from what the generator wrote. Handles OpenAPI 3.x (GitHub, PostHog) and Swagger 2.0
// (Slack's), and nothing else: it is small on purpose, so it can be read as a whole.
import { readFileSync } from "node:fs";

export type Json = null | boolean | number | string | ReadonlyArray<Json> | { readonly [key: string]: Json };
// A schema node, the way the spec spells it: a `$ref`, a `type`, `properties`, `oneOf`...
export type Node = { readonly [key: string]: any };

export interface Spec {
  readonly raw: Node;
  readonly swagger: boolean;
  readonly title: string;
  readonly version: string;
}

export const readSpec = (file: string): Spec => {
  const raw = JSON.parse(readFileSync(file, "utf8")) as Node;
  const swagger = raw["swagger"] !== undefined;
  return { raw, swagger, title: String(raw["info"]?.title), version: String(raw["info"]?.version) };
};

/** Follow `$ref`s (`#/components/schemas/x`, `#/definitions/x`, `#/components/parameters/x`) until a real node. */
export const deref = (spec: Spec, node: Node | undefined): Node => {
  let at = node;
  for (let hops = 0; at !== undefined && typeof at["$ref"] === "string"; hops += 1) {
    if (hops > 50) throw new Error(`a $ref loop at ${String(at["$ref"])}`);
    let target: any = spec.raw;
    for (const part of String(at["$ref"]).replace(/^#\//, "").split("/")) target = target?.[part.replace(/~1/g, "/").replace(/~0/g, "~")];
    if (target === undefined) throw new Error(`a $ref to nothing: ${String(at["$ref"])}`);
    at = target;
  }
  return at ?? {};
};

// ---- names: the one rule (README, "Names") ----

const camel = (word: string): string => {
  const parts = word.split(/[-_]/).filter((p) => p !== "");
  return parts.map((p, i) => (i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1))).join("");
};
/** An operationId's groups and name: `issues/create-comment` is `issues` then `createComment`; `chat_postMessage` is the one name `chatPostMessage`. */
export const nameParts = (operationId: string): ReadonlyArray<string> => operationId.split(/[/.]/).map(camel);
export const dotted = (parts: ReadonlyArray<string>) => parts.join(".");

// ---- calls ----

export interface Param { readonly name: string; readonly where: "path" | "query" | "header" | "formData" | "body"; readonly required: boolean; readonly schema: Node }
export interface Operation {
  readonly id: string;
  readonly parts: ReadonlyArray<string>;
  readonly name: string;
  readonly method: "get" | "post" | "put" | "patch" | "delete";
  readonly path: string;
  /** Everything the caller supplies, flat: path, query and body fields (the token goes in the header, never here). */
  readonly inputs: ReadonlyArray<Param>;
  readonly success: { readonly status: number; readonly schema: Node } | undefined;
  readonly errors: ReadonlyArray<number>;
}

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

export const operations = (spec: Spec): ReadonlyArray<Operation> => {
  const found: Array<Operation> = [];
  for (const [path, item] of Object.entries<Node>(spec.raw["paths"] ?? {})) {
    for (const method of METHODS) {
      const op = item[method] as Node | undefined;
      if (op === undefined || typeof op["operationId"] !== "string") continue;
      const own = [...(item["parameters"] ?? []), ...(op["parameters"] ?? [])].map((p: Node) => deref(spec, p));
      const inputs: Array<Param> = [];
      for (const p of own) {
        if (p["in"] === "header" || p["name"] === "token") continue; // the token is the client's, never an input
        if (p["in"] === "body") { // Swagger 2's one body
          const body = deref(spec, p["schema"]);
          for (const [name, schema] of Object.entries<Node>(body["properties"] ?? {})) inputs.push({ name, where: "body", required: (body["required"] ?? []).includes(name), schema });
        } else inputs.push({ name: String(p["name"]), where: p["in"], required: p["required"] === true || p["in"] === "path", schema: p["schema"] ?? p });
      }
      const content = op["requestBody"] === undefined ? undefined : deref(spec, op["requestBody"])["content"]?.["application/json"]?.["schema"];
      if (content !== undefined) {
        const body = deref(spec, content);
        for (const [name, schema] of Object.entries<Node>(body["properties"] ?? {})) inputs.push({ name, where: "body", required: (body["required"] ?? []).includes(name), schema });
      }
      const statuses = Object.keys(op["responses"] ?? {});
      const ok = statuses.map(Number).filter((s) => s >= 200 && s < 300).sort((a, b) => a - b)[0];
      const response = ok === undefined ? undefined : deref(spec, op["responses"][String(ok)]);
      const schema = response === undefined ? undefined : (spec.swagger ? response["schema"] : response["content"]?.["application/json"]?.["schema"]);
      const parts = nameParts(op["operationId"]);
      found.push({
        id: op["operationId"], parts, name: dotted(parts), method, path, inputs,
        success: ok === undefined || schema === undefined ? undefined : { status: ok, schema },
        errors: statuses.map(Number).filter((s) => s >= 400),
      });
    }
  }
  return found;
};

// ---- events in (GitHub's `webhooks`) ----

/**
 * One event is what GitHub calls an event (`issue_comment`, the webhook's `x-github.subcategory`): the spec lists it
 * once per action (`issue-comment-created`, `issue-comment-edited`...), and its payload is any one of those.
 */
export interface WebhookEvent { readonly key: string; readonly name: string; readonly actions: ReadonlyArray<{ readonly entry: string; readonly schema: Node }> }
export const webhooks = (spec: Spec): ReadonlyArray<WebhookEvent> => {
  const byEvent = new Map<string, Array<{ entry: string; schema: Node }>>();
  for (const [entry, item] of Object.entries<Node>(spec.raw["webhooks"] ?? {})) {
    const schema = item["post"]?.["requestBody"]?.["content"]?.["application/json"]?.["schema"] as Node | undefined;
    const event = item["post"]?.["x-github"]?.["subcategory"] as string | undefined;
    if (schema === undefined || event === undefined) continue;
    byEvent.set(event, [...(byEvent.get(event) ?? []), { entry, schema }]);
  }
  return [...byEvent].map(([key, actions]) => ({ key, name: camel(key), actions }));
};

/** Where requests go: the origin the client is given plus Swagger's basePath. */
export const basePath = (spec: Spec): string => (spec.swagger ? String(spec.raw["basePath"] ?? "") : "");

/** The operation named `a.b` (its dotted name), or a thrown error that names what the spec has. */
export const operationNamed = (spec: Spec, name: string): Operation => {
  const all = operations(spec);
  const found = all.find((o) => o.name === name);
  if (found === undefined) throw new Error(`the spec has no ${name}; it has ${all.slice(0, 8).map((o) => o.name).join(", ")}...`);
  return found;
};
