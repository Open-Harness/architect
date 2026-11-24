import { Blueprint } from "orthograph";
import agents, { things } from "@orthograph/agents";
import { StaleAssignment } from "@orthograph/agents/blueprint/things/agent/errors.ts";
import { EvalDelivered } from "@orthograph/intake/blueprint/things/eval/events.ts";
import { things as ticketThings } from "@orthograph/tickets";
import { InputRouted } from "@orthograph/tickets/blueprint/things/input/events.ts";
import { AssignmentStarted, AssignmentInterrupted } from "@orthograph/tickets/blueprint/things/assignment/events.ts";

const { agent } = things;
const { requeue } = ticketThings.input.operations;

/**
 * How work reaches an agent: only ever as the hop of an event, through the outbox (K40 fix 3, GOAL17-pause). Each tell names the
 * Assignment it is for. A tell for an Assignment the agent has closed is refused, and its Input requeued (GOAL17-executor-slots, section 5).
 */
export default Blueprint.use(agents, (a) => [
  // the main agent is the superagent's own; slice 9 gives the hop its id
  a.on(EvalDelivered, agent.operations.tell, (e) => ({ requestId: e.eval, input: e.eval, opens: false })),
  a.on(InputRouted, agent.operations.tell, (e) => ({ agent: e.agent, requestId: e.input, input: e.text, assignment: e.assignment, opens: false }), { onRefused: { error: StaleAssignment, then: requeue } }),
  a.on(AssignmentStarted, agent.operations.tell, (e) => ({ agent: e.agent, requestId: e.input, input: e.text, assignment: e.assignment, opens: true }), { onRefused: { error: StaleAssignment, then: requeue } }),
  // a stop or a retire reaches the Agent as its own hop, unheld: a person's stop works in a pause
  a.on(AssignmentInterrupted, agent.operations.close, (e) => ({ agent: e.agent, assignment: e.assignment })),
]);
