import { Blueprint, Via } from "orthograph";
import { Superagent } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Superagent, {
  description: "Hold evals, launches, deliveries and replies; sources keep recording. Only a person, through a session.",
  payload: {
    superagent: Superagent.fields.id,
  },
  answer: {
    from: Blueprint.text({ max: 20 }),
    at: Blueprint.uint(64),
  },
  move: machine.moves.pause,
  allowed: [Blueprint.signedIn.via(Via.session)],
});
