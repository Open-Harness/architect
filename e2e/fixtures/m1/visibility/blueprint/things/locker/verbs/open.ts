import { Blueprint, Schema } from "orthograph";
import { Locker } from "../thing.ts";
import { machine } from "../machine.ts";
import { LockerSealed } from "../errors.ts";
import { owner } from "../../organization/roles.ts";

// Anyone may try it; what they see depends on who they are. The answer and the refusal each carry a public, a private and a
// secret field, and the handler tries to return one field more than either declares.
export default Blueprint.operation(Locker, {
  description: "Open a locker with its key, or try to force it with a crowbar.",
  payload: { locker: Locker.fields.id, tool: Blueprint.value(Schema.Literals(["key", "crowbar"])) },
  answer: { locker: Locker.fields.id, label: Locker.fields.label, note: Locker.fields.note, code: Locker.fields.code, seal: Locker.fields.seal },
  move: machine.moves.open,
  errors: [LockerSealed],
  allowed: [owner.of("locker.organization"), Blueprint.anyone],
  steps: { load: Blueprint.step.database() },
});
