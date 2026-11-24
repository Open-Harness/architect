// Two small parts of the model that need nothing of the rest of `describe`.
import type { Role } from "orthograph";
import type { OperationModel } from "../types.ts";
import { READ_NOT_SERVED, READ_NOT_SERVED_CODE } from "./codes.ts";

/** What a role's rule is in the model: its function's text, or the words of an `actor:` or `agent:` role. */
export const roleRuleOf = (r: Role): string =>
  r.actor ? `actor(${r.actor.mount.key}, ${r.actor.id.key}) within ${r.actor.within?.key ?? "nothing"} while [${r.actor.while.map((s) => s.key).join(", ")}]`
  : r.agent ? `agent(${r.agent.key})`
  : r.rule.toString();

/** The refusal of a read not served yet is in the model only when some read can make it, so other blueprints are unchanged. */
export const withReadNotServed = (refusals: Readonly<Record<string, string>>, operations: Readonly<Record<string, OperationModel>>): Readonly<Record<string, string>> =>
  Object.values(operations).some((o) => o.refusals.includes(READ_NOT_SERVED))
    ? Object.fromEntries(Object.entries({ ...refusals, [READ_NOT_SERVED]: READ_NOT_SERVED_CODE }).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    : refusals;

