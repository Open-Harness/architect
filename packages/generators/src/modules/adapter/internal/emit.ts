// The text of each generated file. Data (the operations, the schemas) is JSON parsed when the file loads, so a plugin of
// thousands of calls is quick to read and to type-check; the descriptor and the client are plain code.
import type { Event, Node, Op } from "./extract.ts";

export const generatedLine = (title: string, version: string) => `// Generated from ${title} ${version}. Do not edit.`;

/** A JSON value as one TypeScript expression: a string literal handed to `JSON.parse`. */
const json = (value: unknown, type: string) => `JSON.parse(${JSON.stringify(JSON.stringify(value))}) as ${type}`;

const byName = <A extends { readonly name: string }>(items: ReadonlyArray<A>) => [...items].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
const byParts = (ops: ReadonlyArray<Op>) => [...ops].sort((a, b) => { const [x, y] = [a.parts.join("."), b.parts.join(".")]; return x < y ? -1 : x > y ? 1 : 0; });

export const operationsFile = (ops: ReadonlyArray<Op>) => [
  `import type { Operation } from "../runtime/types.ts";`, "",
  `export const operations = ${json(byParts(ops).map((o) => ({ name: o.parts, method: o.method, path: o.path, params: o.params, success: o.success })), "ReadonlyArray<Operation>")};`, "",
].join("\n");

export const componentsFile = (components: Readonly<Record<string, Node>>) => [
  `import type { Components } from "../runtime/types.ts";`, "",
  `export const components = ${json(components, "Components")};`, "",
].join("\n");

export const eventsFile = (events: ReadonlyArray<Event>) => [
  `import type { EventPayloads } from "../runtime/types.ts";`, "",
  `export const eventPayloads = ${json(Object.fromEntries(byName(events).map((e) => [e.name, e.payloads])), "EventPayloads")};`, "",
].join("\n");

interface Tree { [name: string]: Tree | null }

/** The calls as nested groups. A name that is both a call and a group has no one place in the tree: it is told to the caller. */
export const treeOf = (ops: ReadonlyArray<Op>): { readonly tree: Tree; readonly clashes: ReadonlyArray<string> } => {
  const tree: Tree = {};
  const clashes: Array<string> = [];
  for (const op of byParts(ops)) {
    let at = tree;
    const path = op.parts.slice(0, -1);
    const last = op.parts[op.parts.length - 1]!;
    const blocked = path.findIndex((part) => {
      if (at[part] === null) return true;
      at = (at[part] ??= {});
      return false;
    });
    if (blocked >= 0) clashes.push(op.parts.slice(0, blocked + 1).join("."));
    else if (at[last] !== undefined) clashes.push(op.parts.join("."));
    else at[last] = null;
  }
  return { tree, clashes };
};

const callsText = (tree: Tree, indent: string): string =>
  Object.entries(tree).map(([name, sub]) => sub === null
    ? `${indent}${JSON.stringify(name)}: Blueprint.call(),`
    : `${indent}${JSON.stringify(name)}: {\n${callsText(sub, `${indent}  `)}\n${indent}},`).join("\n");

export const indexFile = (head: string, title: string, version: string, tree: Tree, events: ReadonlyArray<Event>) => [
  head, `import { Blueprint } from "orthograph";`,
  `import { schemaOf } from "./runtime/json-schema.ts";`,
  `import { components } from "./spec/components.ts";`,
  `import { eventPayloads } from "./spec/events.ts";`,
  `import { events as written, standIn } from "./written.ts";`, "",
  `/** The payload of an event: any one of the payloads its service documents for it. */`,
  `const payload = (event: string) => Blueprint.incoming(schemaOf(components, { oneOf: eventPayloads[event] ?? [] }));`, "",
  `export default Blueprint.adapter({`,
  `  description: ${JSON.stringify(`${title} ${version}: every call and event its published description lists.`)},`,
  `  calls: {`, callsText(tree, "    "), `  },`,
  `  events: {`, ...byName(events).map((e) => `    ${JSON.stringify(e.name)}: payload(${JSON.stringify(e.name)}),`), `    ...written,`, `  },`,
  `  standIn,`,
  `});`, "",
].join("\n");

export const clientFile = (head: string) => [
  head,
  `import type adapter from "./index.ts";`,
  `import { makeClient, type ClientOptions, type Input } from "./runtime/client.ts";`,
  `import { components } from "./spec/components.ts";`,
  `import { operations } from "./spec/operations.ts";`, "",
  `export { AnswerRefused, ApiFailure, InputRefused, Unreachable, type ClientOptions, type Input } from "./runtime/client.ts";`, "",
  `type Calls<T> = { readonly [K in keyof T]: T[K] extends { readonly kind: "call" } ? (input?: Input) => Promise<unknown> : Calls<T[K]> };`, "",
  `/** \`client({ baseUrl, token? }).calls.<group>.<call>(input)\` is a promise of the answer's JSON, as it came. */`,
  `export const client = (options: ClientOptions): { readonly calls: Calls<typeof adapter.calls> } => makeClient(operations, components, options) as never;`, "",
].join("\n");
