import { Blueprint } from "orthograph";
import { Account } from "./thing.ts";
import { machine } from "./machine.ts";

/**
 * K40 fix 1, with GOAL17-source-from's refinement: the outside account that sent the call, matched by its mount and its stable
 * id, and only for the superagent it is listed for.
 */
export const listed = Blueprint.role(Account, {
  actor: { mount: Account.fields.source, id: Account.fields.external },
  within: Account.fields.superagent,
  while: [machine.states.listed],
});
