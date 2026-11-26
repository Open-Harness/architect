import { Blueprint } from "orthograph";
import { Desk } from "./thing.ts";
import { Instant } from "../../values/time.ts";

export const DeskHeld = Blueprint.event({ desk: Desk.fields.id, heldAt: Instant });
export const DeskReleased = Blueprint.event({ desk: Desk.fields.id });
export const DeskExpired = Blueprint.event({ desk: Desk.fields.id, at: Instant });
