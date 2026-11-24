import { Blueprint } from "orthograph";
import { Mandate } from "./thing.ts";

export const MandateHeld = Blueprint.event({ mandate: Mandate.fields.id, ticket: Mandate.fields.ticket });
export const MandateWithdrawn = Blueprint.event({ mandate: Mandate.fields.id, ticket: Mandate.fields.ticket });
export const MandateRevalidated = Blueprint.event({ mandate: Mandate.fields.id, ticket: Mandate.fields.ticket });
