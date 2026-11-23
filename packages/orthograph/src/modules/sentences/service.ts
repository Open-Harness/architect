import type { RuleFacts } from "./types.ts";
import { joined, words } from "./internal/words.ts";

export { words } from "./internal/words.ts";
export type { RuleFacts } from "./types.ts";

/**
 * The one sentence for a rule (G5, the grill's Q2), shared by the docs, MCP's description, the scaffold's header and the portal: the rule's own
 * `description` when it wrote one (without its closing full stop, which the outputs add themselves), else "another claimed handle holds this name", made from the thing, the states it holds in and its key.
 */
export const ruleSentence = (thing: string, rule: RuleFacts): string => {
  // One closing full stop goes (an ellipsis stays); a description left with nothing falls back to the generated sentence.
  const written = rule.description?.trim().replace(/(?<!\.)\.$/, "");
  return written ? written : `another ${rule.while && rule.while.length > 0 ? `${joined(rule.while, "or")} ` : ""}${words(thing)} holds this ${joined(rule.fields.map(words), "and")}`;
};
