import { Blueprint } from "orthograph";
import { Spend } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Spend, {
  states: ["drafted", "sent", "paid", "discarded", "unexplained"],
  moves: {
    draft:   { from: [],              to: "drafted",     emits: Events.SpendDrafted },
    send:    { from: ["drafted"],     to: "sent",        emits: Events.SpendSent },      // signed; the relayer has it
    settle:  { from: ["sent"],        to: "paid",        emits: Events.SpendPaid },      // the chain will keep it
    discard: { from: ["drafted", "sent"], to: "discarded", emits: Events.SpendDiscarded }, // refused, or never signed
    appear:  { from: [],              to: "unexplained", emits: Events.SpendAppeared },  // money moved with no note
    explain: { from: ["unexplained"], to: "paid",        emits: Events.SpendExplained },
  },
  notFrom: { exit: 40 },
});
