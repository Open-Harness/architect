import type { Node, Rule } from "../types.ts";
import { SCHEMA, factsOf, pathOf } from "./facts.ts";

const nameOf = (node: Node | undefined) => node?.type === "Identifier" ? node["name"] : node?.type === "Literal" ? node["value"] : undefined;

const member = (node: Node | undefined) => {
  if (node?.type !== "MemberExpression") return undefined;
  const property = node["property"] as Node;
  return node["computed"] === true && property.type !== "Literal" ? undefined : nameOf(property);
};

export const requiredStepUsed: Rule = {
  meta: { schema: SCHEMA, docs: { description: "Warns when the handler never calls a required step runner." } },
  create: (context) => {
    const facts = factsOf(context);
    const path = pathOf(context, facts);
    const missing = new Set(path === undefined ? [] : facts.requiredSteps?.[path]);
    if (missing.size === 0) return {};
    const steps = new Set<unknown>(["steps"]);
    const isSteps = (node: Node) => steps.has(nameOf(node)) || member(node) === "steps";
    return {
      Property: (node) => {
        if (node.parent?.type === "ObjectPattern" && nameOf(node["key"] as Node) === "steps") {
          const binding = nameOf(node["value"] as Node);
          if (typeof binding === "string") steps.add(binding);
        }
      },
      CallExpression: (node) => {
        const callee = node["callee"] as Node;
        const key = member(callee);
        // shortcut: statically named runner calls only, follow indirect calls if handlers start sharing runners.
        if (typeof key === "string" && isSteps(callee["object"] as Node)) missing.delete(key);
      },
      "Program:exit": (node) => {
        for (const key of missing) context.report({ node, message: `required step steps.${key} is never called` });
      },
    };
  },
};
