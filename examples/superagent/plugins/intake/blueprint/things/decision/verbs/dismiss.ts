import { Blueprint } from "orthograph";
import { Decision } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Decision, {
  description: "Set aside a decision a person disagrees with.",
  payload: { decision: Decision.fields.id },
  answer: {  },
  move: machine.moves.dismiss,
  allowed: [Blueprint.signedIn],
});
