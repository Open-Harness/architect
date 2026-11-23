import { Blueprint } from "orthograph";
import { Superagent } from "../thing.ts";
import { SlotsOutOfRange, StaleRevision } from "../errors.ts";
import { itsMain } from "../roles.ts";

export default Blueprint.operation(Superagent, {
  description: "Save a superagent's configuration as a new version; a stale save is refused.",
  payload: {
    superagent: Superagent.fields.id,
    base: Blueprint.uint(32),
    name: Superagent.fields.name,
    purpose: Superagent.fields.purpose,
    connections: Superagent.fields.connections,
    playbook: Superagent.fields.playbook,
    slots: Superagent.fields.slots,
  },
  answer: {
    revision: Blueprint.uint(32),
  },
  errors: [SlotsOutOfRange, StaleRevision],
  allowed: [Blueprint.signedIn, itsMain.of("superagent")],
});
