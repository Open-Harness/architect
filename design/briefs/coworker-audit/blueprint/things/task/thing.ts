import { Blueprint } from "orthograph";
import { Manager } from "../manager/thing.ts";
import { Lane } from "../lane/thing.ts";
import { Title, Body, Checks } from "../../values/coworker.ts";

export const Task = Blueprint.thing({
  description: "A piece of work on a manager's board: why it exists, when it is done, who answers for it and what happens next.",
  fields: {
    id: Blueprint.id("tsk"),
    manager: Manager.fields.id,
    under: Blueprint.optional(Blueprint.id("tsk")),
    lane: Lane.fields.id,
    title: Title,
    why: Body,
    doneWhen: Checks, // the checklist with progress on the agreed Task screen
    owner: Blueprint.optional(Blueprint.id("per")),
    mandate: Blueprint.optional(Blueprint.id("mdt")), // "Why this is allowed": from @orthograph/tickets
  },
  code: "TK",
});
// Custom fields per board (choice, text, number, date, person) are on the screen today.
// GAP custom-fields: a thing's fields are fixed at compile time. Work round: one `values` field holding a struct, unchecked.
// Evidence, comments and history are their own rows (or the journal), not arrays on the task.
