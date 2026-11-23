// no-wall-clock and handler-matches-path: time goes through Timers and Clock; a handler file is where its operation says.
import type { Rule } from "../types.ts";
import { SCHEMA, constructed, factsOf, pathOf } from "./facts.ts";
import { sqlClockMessage } from "./sql-clock.ts";

export const noWallClock: Rule = {
  meta: { schema: SCHEMA, docs: { description: "No Date.now, new Date(), setTimeout or raw Effect.sleep outside the runtime: use Clock and Timers." } },
  create: (context) => {
    const path = pathOf(context, factsOf(context));
    if (path === undefined || path.startsWith("generated/")) return {};
    return {
      MemberExpression: (node) => {
        const o = node["object"] as { type?: string; name?: string };
        const p = node["property"] as { name?: string };
        if (o.type === "Identifier" && o.name === "Date" && p.name === "now") context.report({ node, message: "Date.now reads the wall clock: use Clock" });
        if (o.type === "Identifier" && o.name === "Effect" && p.name === "sleep") context.report({ node, message: "a raw Effect.sleep waits outside counted work: use Timers" });
      },
      NewExpression: (node) => {
        if (constructed(node) === "Date" && (node["arguments"] as ReadonlyArray<unknown>).length === 0) context.report({ node, message: "new Date() reads the wall clock: use Clock" });
      },
      CallExpression: (node) => {
        const name = constructed(node);
        if (name === "setTimeout" || name === "setInterval") context.report({ node, message: `${name} waits outside counted work: use Timers` });
      },
      // SQL that asks the database for the time: a world has one clock, and the database is not it (K23 section 6).
      Literal: (node) => {
        const message = sqlClockMessage(node);
        if (message !== undefined) context.report({ node, message });
      },
      TemplateElement: (node) => {
        const message = sqlClockMessage(node);
        if (message !== undefined) context.report({ node, message });
      },
    };
  },
};

// A thing's other code (workflows, contracts) lives in the same folder under other names: only <verb>.ts is a handler.
const HANDLER_SHAPE = /^src\/[^/]+\/[^/.]+\.ts$/;

export const handlerMatchesPath: Rule = {
  meta: { schema: SCHEMA, docs: { description: "src/<thing>/<verb>.ts belongs to a declared operation." } },
  create: (context) => {
    const facts = factsOf(context);
    const path = pathOf(context, facts);
    if (path === undefined || !HANDLER_SHAPE.test(path) || path in facts.handlers) return {};
    return {
      Program: (node) => {
        const [, thing, file] = path.split("/");
        context.report({ node, message: `no declared operation ${thing}.${file?.replace(/\.ts$/, "")} has its handler here` });
      },
    };
  },
};
