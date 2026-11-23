// effect-only: effects happen at the edges. No async, await, try, throw or wall-clock time in package source, except in
// a package's entry (src/main.ts), a test (vitest is its entry) and the entries a config names (AGENTS.md, the code's
// own rules).
import type { Node, Rule } from "../types.ts";
import { SCHEMA, constructed } from "./facts.ts";
import { collector, optionsOf, sourcePath } from "./baselined.ts";
import { sqlClockMessage } from "./sql-clock.ts";

const ENTRY = /^packages\/[^/]+\/src\/main\.ts$/;
const TEST = /\.test\.tsx?$/;
// `globalThis.setTimeout(...)` is setTimeout too. Computed forms (`Date["now"]`) are not judged: lint reads names.
const GLOBALS = new Set(["globalThis", "window", "self", "global"]);

const asyncFunction = (add: (node: Node, message: string) => void) => (node: Node) => {
  if (node["async"] === true) add(node, "an async function: return an Effect instead");
};

export const effectOnly: Rule = {
  meta: { schema: SCHEMA, docs: { description: "No async, await, try, throw, Date.now, new Date(), setTimeout or Effect.sleep outside entry files: Effect, Clock and Timers." } },
  create: (context) => {
    const path = sourcePath(context);
    if (path === undefined || ENTRY.test(path) || TEST.test(path) || (optionsOf(context).entries ?? []).includes(path)) return {};
    const { add, flush } = collector(context, "effect-only", path);
    return {
      FunctionDeclaration: asyncFunction(add),
      FunctionExpression: asyncFunction(add),
      ArrowFunctionExpression: asyncFunction(add),
      AwaitExpression: (node) => add(node, "await: yield* an Effect instead"),
      ForOfStatement: (node) => {
        if (node["await"] === true) add(node, "for await: use a Stream instead");
      },
      VariableDeclaration: (node) => {
        if (node["kind"] === "await using") add(node, "await using: use Effect.acquireRelease instead");
      },
      TryStatement: (node) => add(node, "try: errors are values; use Effect.try or Effect.catch"),
      ThrowStatement: (node) => add(node, "throw: fail with a tagged error (Effect.fail) instead"),
      MemberExpression: (node) => {
        const o = node["object"] as { type?: string; name?: string };
        const p = node["property"] as { name?: string };
        if (o.type !== "Identifier" || node["computed"] === true) return;
        if (o.name === "Date" && p.name === "now") add(node, "Date.now reads the wall clock: use Clock");
        if (o.name === "Effect" && p.name === "sleep") add(node, "a plain Effect.sleep waits outside counted work: use Timers");
      },
      NewExpression: (node) => {
        if (constructed(node) === "Date" && (node["arguments"] as ReadonlyArray<unknown>).length === 0) add(node, "new Date() reads the wall clock: use Clock");
      },
      CallExpression: (node) => {
        const callee = node["callee"] as { type?: string; computed?: boolean; object?: { type?: string; name?: string }; property?: { name?: string } };
        const global = callee.type === "MemberExpression" && callee.computed !== true && callee.object?.type === "Identifier" && GLOBALS.has(callee.object.name ?? "");
        const name = global ? callee.property?.name : constructed(node);
        if (name === "setTimeout" || name === "setInterval") add(node, `${name} waits outside counted work: use Timers`);
      },
      // SQL that asks the database for the time: a world has one clock, and the database is not it (K23 section 6).
      Literal: (node) => {
        const message = sqlClockMessage(node);
        if (message !== undefined) add(node, message);
      },
      TemplateElement: (node) => {
        const message = sqlClockMessage(node);
        if (message !== undefined) add(node, message);
      },
      "Program:exit": flush,
    };
  },
};
