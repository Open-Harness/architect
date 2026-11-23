import { Blueprint } from "orthograph";
import { Superagent } from "../thing.ts";
import { machine } from "../machine.ts";
import { SlotsOutOfRange } from "../errors.ts";

export default Blueprint.operation(Superagent, {
  description: "Make a superagent, with its main agent, observing.",
  payload: {
    name: Superagent.fields.name,
    purpose: Superagent.fields.purpose,
    connections: Superagent.fields.connections,
    playbook: Superagent.fields.playbook,
    slots: Superagent.fields.slots,
    main: Superagent.fields.main,
  },
  answer: {
    superagent: Superagent.fields.id,
  },
  move: machine.moves.create,
  errors: [SlotsOutOfRange],
  allowed: [Blueprint.signedIn],
});
