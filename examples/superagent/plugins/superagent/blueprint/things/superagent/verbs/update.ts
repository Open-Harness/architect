import { Blueprint } from "orthograph";
import { Superagent } from "../thing.ts";
import { SlotsOutOfRange, StaleRevision } from "../errors.ts";
import { itsMain, proposed, WHY_MAX } from "../roles.ts";

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
    why: Blueprint.optional(Blueprint.text({ max: WHY_MAX })),
  },
  answer: {
    revision: Blueprint.uint(32),
  },
  errors: [SlotsOutOfRange, StaleRevision],
  allowed: [Blueprint.signedIn, itsMain.of("superagent")],
  proposes: proposed({ revision: 0n }),
});
