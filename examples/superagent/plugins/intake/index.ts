import { Blueprint } from "orthograph";
import * as triggerEvents from "./blueprint/things/trigger/events.ts";
import * as threadEvents from "./blueprint/things/thread/events.ts";
import * as evalEvents from "./blueprint/things/eval/events.ts";
import * as decisionEvents from "./blueprint/things/decision/events.ts";
import * as policyEvents from "./blueprint/things/policy/events.ts";
import due from "./blueprint/things/eval/verbs/due.ts";
import delivered from "./blueprint/things/eval/verbs/delivered.ts";

export default Blueprint.feature({
  description: "Source, Account, Trigger, Thread, Correlation, Eval, Decision and Policy: what a superagent hears, who may ask, and what the main agent decides.",
});

/** What an app wires: this plugin's events, and the operations an outbox hop may call. */
export const events = { ...triggerEvents, ...threadEvents, ...evalEvents, ...decisionEvents, ...policyEvents };
export const things = { eval: { operations: { due, delivered } } };
