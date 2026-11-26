import { Blueprint } from "orthograph";
import { Manager } from "../manager/thing.ts";
import { Title, Note } from "../../values/coworker.ts";

// Lanes are data a manager or a person edits, so a task's lane is a field and not a machine state.
// AARON: model-next.md drops lanes from Work and first-principles 28 keeps the board. This sketch keeps both: a lane
// for where a card sits, and a machine for whether the work is open. Board decision 6.
export const Lane = Blueprint.thing({
  description: "A column of one manager's board: what it means, whether leaving it asks first, and its limit.",
  fields: {
    id: Blueprint.id("lan"), manager: Manager.fields.id, name: Title, means: Note,
    asksFirst: Blueprint.bool(), limit: Blueprint.optional(Blueprint.uint(16)), order: Blueprint.uint(16),
  },
});
