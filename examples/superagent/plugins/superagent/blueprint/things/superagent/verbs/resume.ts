import { Blueprint, Via } from "orthograph";
import { Superagent } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Superagent, {
  description: "Let held work go, and move every eval's deadline later by the pause's length. Only a person, through a session.",
  payload: {
    superagent: Superagent.fields.id,
  },
  answer: {
    to: Blueprint.text({ max: 20 }),
    at: Blueprint.uint(64),
    length: Blueprint.uint(64),
  },
  move: machine.moves.resume,
  allowed: [Blueprint.signedIn.via(Via.session)],
});
