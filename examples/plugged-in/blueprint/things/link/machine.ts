import { Blueprint } from "orthograph";
import { Link } from "./thing.ts";
import { LinkAdded, LinkRemoved } from "./events.ts";

export const machine = Blueprint.machine(Link, {
  states: ["listed", "removed"],
  moves: {
    add: { from: [], to: "listed", emits: LinkAdded },
    remove: { from: ["listed"], to: "removed", emits: LinkRemoved },
  },
  notFrom: { exit: 31 },
});
