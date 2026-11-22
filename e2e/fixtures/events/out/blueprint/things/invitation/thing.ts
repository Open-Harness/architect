import { Blueprint } from "orthograph";
import { Email } from "../../values/people.ts";

export const Invitation = Blueprint.thing({
  description: "An invitation to join, sent to an email address. Sending it tells the notifier, which delivers it.",
  fields: { id: Blueprint.id("inv"), email: Email },
});
