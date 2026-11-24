import { Blueprint } from "orthograph";
import { Subscription } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Subscription, {
  states: ["live", "ended"],
  moves: {
    follow: { from: [], to: "live", emits: Events.SubscriptionStarted },
    unfollow: { from: ["live"], to: "ended", emits: Events.SubscriptionEnded },
  },
  notFrom: { exit: 92 },
});
