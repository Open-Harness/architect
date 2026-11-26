import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/attach.ts";

/** Attach another thread to a ticket. Not written yet: slice 7 gives it its body. */
const attach: Handler<typeof declaration> = () => Handlers.blank("ticket.attach is not written yet");

export default attach;
