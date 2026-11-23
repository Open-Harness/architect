import { Blueprint } from "orthograph";
import { Locker } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../organization/roles.ts";

export default Blueprint.operation(Locker, {
  description: "Put a locker in an organisation.",
  payload: { organization: Locker.fields.organization, label: Locker.fields.label },
  answer: { locker: Locker.fields.id },
  move: machine.moves.install,
  errors: [],
  allowed: [owner.of("organization")],
  steps: { insert: Blueprint.step.database() },
});
