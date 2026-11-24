import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/request-status.ts";

/** Ask a ticket's executor where it stands; a person's request may use the seat kept for a person. Not written yet: slice 7 gives it its body. */
const requestStatus: Handler<typeof declaration> = () => Handlers.blank("ticket.request-status is not written yet");

export default requestStatus;
