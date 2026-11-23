// refusal-has-log and declared-errors-only: in a handler, every refusal is a declared error, said why before it.
import type { Node, Rule } from "../types.ts";
import { SCHEMA, constructed, factsOf, pathOf } from "./facts.ts";

const FUNCTION = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

/** Whether some statement before `node`'s own, in a block around it (up to its function), logs with Effect.log*. */
const loggedBefore = (node: Node, text: (n: Node) => string): boolean => {
  let child: Node = node;
  for (let at = node.parent; at && !FUNCTION.has(at.type); child = at, at = at.parent) {
    if (at.type !== "BlockStatement" && at.type !== "Program") continue;
    const body = at["body"] as ReadonlyArray<Node>;
    const before = body.slice(0, body.indexOf(child));
    if (before.some((s) => /\bEffect\.log(Info|Warning|Error|Debug|Trace|Fatal)?\b/.test(text(s)))) return true;
  }
  return false;
};

/**
 * A call step's failure mapping, `steps.price([...], (failure) => new PriceUnavailable({}))`: the step itself logs what
 * decided the refusal, naming it and never the foreign failure, so the mapping has no place for a log of its own.
 */
const mappingOfACall = (node: Node, text: (n: Node) => string): boolean => {
  let at = node.parent;
  while (at && !FUNCTION.has(at.type)) at = at.parent;
  const call = at?.parent;
  return call?.type === "CallExpression" && /^steps\.\w+$/.test(text(call["callee"] as Node));
};

export const refusalHasLog: Rule = {
  meta: { schema: SCHEMA, docs: { description: "A handler logs why before it refuses, so the refusal explains itself." } },
  create: (context) => {
    const facts = factsOf(context);
    const path = pathOf(context, facts);
    if (path === undefined || !path.startsWith("src/")) return {};
    const errors = new Set(facts.errors);
    return {
      NewExpression: (node) => {
        const name = constructed(node);
        const text = (n: Node) => context.sourceCode.getText(n);
        if (name && errors.has(name) && !loggedBefore(node, text) && !mappingOfACall(node, text)) {
          context.report({ node, message: `${name} is refused with no Effect.log* before it saying why` });
        }
      },
    };
  },
};

export const declaredErrorsOnly: Rule = {
  meta: { schema: SCHEMA, docs: { description: "A handler constructs only the errors its operation declares (D2 #50)." } },
  create: (context) => {
    const facts = factsOf(context);
    const path = pathOf(context, facts);
    const declared = path === undefined ? undefined : facts.handlers[path];
    if (declared === undefined) return {};
    const errors = new Set(facts.errors);
    return {
      NewExpression: (node) => {
        const name = constructed(node);
        if (name && errors.has(name) && !declared.includes(name)) {
          context.report({ node, message: `${name} is not one of this operation's errors: ${declared.join(", ") || "it declares none"}` });
        }
      },
    };
  },
};
