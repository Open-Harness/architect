import { Blueprint } from "orthograph";
import { Account } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Account, {
  states: ["seen", "listed", "unlisted"],
  moves: {
    seen: { from: [], to: "seen", emits: Events.AccountSeen },
    list: { from: ["seen", "unlisted"], to: "listed", emits: Events.AccountListed },
    unlist: { from: ["listed"], to: "unlisted", emits: Events.AccountUnlisted },
  },
  notFrom: { exit: 81 },
});
