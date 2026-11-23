import { Blueprint } from "orthograph";
import { Superagent } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Superagent, {
  description: "Let a superagent act: a person, after reading what it would have accepted.",
  payload: {
    superagent: Superagent.fields.id,
  },
  answer: {},
  move: machine.moves.goLive,
  allowed: [Blueprint.signedIn],
});
