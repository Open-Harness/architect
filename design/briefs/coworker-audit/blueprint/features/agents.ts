import { Blueprint } from "orthograph";
import agents, { things } from "@orthograph/agents";
import { ManagerWoken } from "../things/manager/events.ts";
import { RunStarted, RunStopped } from "../things/run/events.ts";

const { agent } = things;

// Work reaches an agent only as the hop of an event (K40 fix 3). A manager is one Agent for good; a run is one Agent.
// GAP durable-agent-run: `agent.tell` and `agent.close` are blank handlers on `main`; the runtime is draft #781.
// GAP outbox: these hops need the outbox, draft #905.
export default Blueprint.use(agents, (a) => [
  a.on(ManagerWoken, agent.operations.tell, (e) => ({ agent: e.agent, requestId: e.wake, input: e.what, opens: false })),
  a.on(RunStarted, agent.operations.tell, (e) => ({ agent: e.agent, requestId: e.run, input: e.brief, opens: true })),
  a.on(RunStopped, agent.operations.close, (e) => ({ agent: e.agent })),
]);
