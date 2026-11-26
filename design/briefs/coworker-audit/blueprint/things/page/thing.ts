import { Blueprint } from "orthograph";
import { Manager } from "../manager/thing.ts";
import { Title, Body } from "../../values/coworker.ts";

export const Page = Blueprint.thing({
  description: "A page a manager and its people both write: its mission, and what hangs under it.",
  fields: { id: Blueprint.id("pge"), manager: Manager.fields.id, parent: Blueprint.optional(Blueprint.id("pge")), title: Title, body: Body },
  versions: { key: "id" }, // a stale save is refused today by comparing `updatedAt`; versions give that and the history
});
