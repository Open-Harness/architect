import { Blueprint } from "orthograph";
import { Notification } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Notification, {
  states: ["delivered"],
  moves: {
    deliver: { from: [], to: "delivered", emits: Events.NotificationDelivered },
  },
  notFrom: { exit: 80 },
});
