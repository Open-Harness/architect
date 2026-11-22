import { Blueprint } from "orthograph";
import { Title } from "../../values/counts.ts";
import { Email } from "../../values/people.ts";

export const Notification = Blueprint.thing({
  description: "A notification the notifier delivered. `cause` is the id of the event that made it: one event, one notification.",
  fields: { id: Blueprint.id("ntf"), to: Email, cause: Title },
});
