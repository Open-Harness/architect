import { Blueprint } from "orthograph";
import { Ask } from "../thing.ts";
import { machine } from "../machine.ts";
import { itsManager } from "../../manager/roles.ts";

export default Blueprint.operation(Ask, {
  description: "Ask a person. The manager carries on; the answer comes back as its next turn.",
  payload: { manager: Ask.fields.manager, about: Ask.fields.about, to: Ask.fields.to, need: Ask.fields.need, title: Ask.fields.title, shows: Ask.fields.shows, options: Ask.fields.options },
  answer: { ask: Ask.fields.id },
  move: machine.moves.raise,
  allowed: [itsManager.of("manager"), Blueprint.system], // the system raises one when an action set to ask is tried
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
});
