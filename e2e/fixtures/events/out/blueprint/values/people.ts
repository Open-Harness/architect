import { Blueprint } from "orthograph";

/** An email address. The fixture sends none: its "email" is a request to the check's own sender (src/notification/invite.ts). */
export const Email = Blueprint.value(Blueprint.email());
