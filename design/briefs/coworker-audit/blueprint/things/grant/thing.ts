import { Blueprint } from "orthograph";
import { Manager } from "../manager/thing.ts";
import { Action, Mode } from "../../values/coworker.ts";

// What a manager may do: "a smaller part handed down at each level, taken back from above".
// The old app has on, ask or off per manager over a string catalogue of 76 actions, 46 with nothing behind them.
// Here an action is an operation of the blueprint, so the catalogue is the model and cannot drift.
export const Grant = Blueprint.thing({
  description: "A part of what the holder above may do, handed to a manager: one action, on or ask, on one account and place.",
  fields: {
    id: Blueprint.id("grt"),
    holder: Manager.fields.id,
    from: Blueprint.optional(Blueprint.id("grt")), // whose part it is; taking that away takes this
    account: Blueprint.optional(Blueprint.id("acc")), // from @orthograph/intake
    on: Blueprint.text({ max: 200 }), // "acme/api", "#launch", "*"
    action: Action,
    mode: Mode,
  },
});
// GAP grants: three things the framework cannot hold.
//  1. A role decided by rows of data: "this caller holds a grant for this operation". `allowed` takes roles declared in code.
//  2. Ask as an outcome of a call: neither allowed nor refused, but an Ask raised and the call made on a yes.
//     The status page has it as `gap-approval-declaration` and `approvals-once`, both spiked, no slice.
//  3. "Wider than its parent is an error": an invariant across two rows of one thing.
// AARON: whether grants are a framework primitive (every Orthograph app with agents wants them) or Coworker's own
// guard in handlers. Board decision 5.
