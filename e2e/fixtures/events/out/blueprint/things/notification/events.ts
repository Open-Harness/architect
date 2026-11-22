import { Blueprint } from "orthograph";
import { Notification } from "./thing.ts";
import { Title } from "../../values/counts.ts";
import { Email } from "../../values/people.ts";

export const NotificationDelivered = Blueprint.event({ notification: Notification.fields.id, to: Email, cause: Title });
