import { Blueprint } from "orthograph";
import { Ask } from "../thing.ts";
import { machine } from "../machine.ts";

/** Only the person it is addressed to. `ask` is answered by a person only (model-next.md): never an agent signed in for them. */
const addressee = Blueprint.role(Ask, { rule: (ask, principal) => ask.to === principal.person });

export default Blueprint.operation(Ask, {
  description: "Answer what is waiting on you: pick an option, or say it in your own words.",
  payload: { ask: Ask.fields.id, answer: Ask.fields.answer },
  answer: {},
  move: machine.moves.answer,
  allowed: [addressee],
  steps: { record: Blueprint.step.database() },
});
// GAP person-not-agent: `examples/work` hit the same wall (F5 section 4): a principal could not tell a person from an
// agent acting for them. K40's agent caller (#781) is what closes it.
