import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/accept.ts";

/** Make a ticket from an accepted trigger: its mandate, subscription, first assignment and first input, in one commit. Not written yet: slice 7 gives it its body. */
const accept: Handler<typeof declaration> = () => Handlers.blank("ticket.accept is not written yet");

export default accept;
