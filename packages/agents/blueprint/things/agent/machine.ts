import { Blueprint } from "orthograph";
import { Agent } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Agent, {
  states: ["idle", "working", "stopped"],
  moves: {
    open: { from: [], to: "idle", emits: Events.AgentOpened },
    tell: { from: ["idle", "working"], to: "working", emits: Events.AgentTold },
    idled: { from: ["working"], to: "idle", emits: Events.AgentIdled },
    close: { from: ["idle", "working"], to: ["idle", "stopped"], emits: Events.AgentClosed },
  },
  notFrom: { exit: 50 },
});
