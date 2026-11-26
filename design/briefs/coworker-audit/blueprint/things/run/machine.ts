import { Blueprint } from "orthograph";
import { Run } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Run, {
  states: ["running", "waiting", "ended", "stopped"],
  moves: {
    start: { from: [], to: "running", emits: Events.RunStarted },
    report: { from: ["running", "waiting"], to: "running", emits: Events.RunReported }, // progress
    wait: { from: ["running"], to: "waiting", emits: Events.RunReported }, // waiting or blocked: its manager is woken
    end: { from: ["running", "waiting"], to: "ended", emits: Events.RunEnded }, // ready, failed or dropped
    stop: { from: ["running", "waiting"], to: "stopped", emits: Events.RunStopped }, // a person or its manager
    // The old app's hole: a model that stops without reporting leaves the run running for ever.
    idled: { from: ["running"], to: "ended", emits: Events.RunEnded }, // made by AgentIdled from @orthograph/agents, not by a caller
  },
});
// K46's check on waiting states (a way out for yes, for no and for silence) is sketched and not built.
// GAP clock-moves: "silence" needs a move made by time. `world-clock-keeper` is spiked.
