import { Blueprint } from "orthograph";
import { Superagent } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Superagent, {
  description: "Close a superagent's connections and agents.",
  payload: {
    superagent: Superagent.fields.id,
  },
  answer: {},
  move: machine.moves.retire,
  allowed: [Blueprint.signedIn],
});
