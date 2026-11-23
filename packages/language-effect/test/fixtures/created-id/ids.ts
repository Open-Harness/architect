// Planted fixture (K16 review, check 2; MAC-08). Compiled on its own by handler/k16-review.test.ts, never by the package's
// typecheck. A creating move (`from: []`) has its id minted and handed in; a move from a state has none, so a handler for
// it is given `id: undefined`, as the runtime gives it. Each line below compiles only when that holds, and not as `any`.
import { Effect } from "effect";
import { Blueprint } from "orthograph";
import { EventNames } from "orthograph/server";
import type { Handler } from "../../../src/modules/handler/types.ts";

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const Amount = Blueprint.value(Blueprint.uint(128));
const Purse = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("pur"), limit: Amount } });
const Opened = Blueprint.event({ purse: Purse.fields.id });
EventNames.name(Opened, "Opened");
const Spent = Blueprint.event({ purse: Purse.fields.id });
EventNames.name(Spent, "Spent");
const Resumed = Blueprint.event({ purse: Purse.fields.id });
EventNames.name(Resumed, "Resumed");
const machine = Blueprint.machine(Purse, {
  states: ["active", "paused", "exhausted"],
  moves: {
    open: { from: [], to: "active", emits: Opened },
    spend: { from: ["active"], to: ["active", "exhausted"], emits: Spent },
    resume: { from: ["paused", "exhausted"], to: "active", emits: Resumed },
  },
  notFrom: { exit: 40 },
});
const open = Blueprint.operation(Purse, { description: "Open a purse.", payload: { limit: Amount }, answer: { purse: Purse.fields.id }, move: machine.moves.open, allowed: [Blueprint.anyone] });
const spend = Blueprint.operation(Purse, { description: "Spend.", payload: { purse: Purse.fields.id }, answer: {}, move: machine.moves.spend, allowed: [Blueprint.anyone] });
const resume = Blueprint.operation(Purse, { description: "Resume.", payload: { purse: Purse.fields.id }, answer: {}, move: machine.moves.resume, allowed: [Blueprint.anyone] });

type IdIn<O> = Parameters<Handler<O>>[1]["id"];
type PurseId = typeof Purse.fields.id.value.schema.Type;

// A creating move: the minted id.
export const minted: Equals<IdIn<typeof open>, PurseId> = true;
// A move from one state, and from two: no id.
export const fromOne: Equals<IdIn<typeof spend>, undefined> = true;
export const fromTwo: Equals<IdIn<typeof resume>, undefined> = true;

// And as a handler writes it: answering with the id compiles for open.
export const opened: Handler<typeof open> = (_payload, { id }) => Effect.succeed({ purse: id });
