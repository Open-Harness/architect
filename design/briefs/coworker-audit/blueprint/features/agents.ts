import { Blueprint } from "orthograph";
import agents, { things } from "@orthograph/agents";
import { AgentIdled } from "@orthograph/agents/blueprint/things/agent/events.ts";
import { ManagerCreated, ManagerWoken } from "../things/manager/events.ts";
import { RunStarted, RunReported, RunStopped } from "../things/run/events.ts";
import { AskAnswered, AskLapsed } from "../things/ask/events.ts";
import runIdled from "../things/run/verbs/idled.ts";

const { agent } = things;

// Every agent is an actor: one Durable Object, one Pi harness, one root conversation for good (K39 call 8).
// Between agents, and between a person and an agent, nothing is a Pi child: a thing keeps the record of what is
// awaited, and its event is delivered to the other agent as a submission with a request id. This is Pi's own
// webhook and ask-a-person pattern (examples 39, 40) and its background-subagent reporter (22), with the outbox as
// the reporter (#905). Every hop below is retried in order, and taken once by its request id.
// GAP durable-agent-run: `agent.tell` and `agent.close` are blank on main; the runtime is draft #781 (Pi 1.5.0; take 1.6.0).
// GAP outbox: draft #905; "a thing that lives as an actor writes no rows yet", so the AgentIdled hop waits on it.
export default Blueprint.use(agents, (a) => [
  // down: a manager is made, then told; a worker is opened and given its brief
  a.on(ManagerCreated, agent.operations.open, (e) => ({ kind: "manager", about: e.manager })),
  a.on(RunStarted, agent.operations.tell, (e) => ({ agent: e.agent, requestId: e.run, input: e.brief, opens: true })),
  // up: everything that wakes a manager is a follow-up input in its one conversation (first-principles 16)
  a.on(ManagerWoken, agent.operations.tell, (e) => ({ agent: e.agent, requestId: e.wake, input: e.what, opens: false })),
  a.on(RunReported, agent.operations.tell, (e) => ({ agent: e.managerAgent, requestId: e.report, input: e.note, opens: false })),
  a.on(AskAnswered, agent.operations.tell, (e) => ({ agent: e.askerAgent, requestId: e.ask, input: e.answer, opens: false })),
  a.on(AskLapsed, agent.operations.tell, (e) => ({ agent: e.askerAgent, requestId: e.ask, input: "No answer by the deadline.", opens: false })),
  // stop, and the silent run: a turn that ended without a report ends its run and tells the manager
  a.on(RunStopped, agent.operations.close, (e) => ({ agent: e.agent })),
]);

// The idle hop lives with the run, not the agent: `AgentIdled` → `run.idled`, which ends a run that never reported.
export const idle = Blueprint.on(AgentIdled, runIdled, (e) => ({ agent: e.agent })); // spelling as in events/service.ts
