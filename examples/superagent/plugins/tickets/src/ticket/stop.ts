import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/stop.ts";

/** Stop a ticket: its mandate is withdrawn and its executor's turn closed. Not written yet: slice 7 gives it its body. */
const stop: Handler<typeof declaration> = () => Handlers.blank("ticket.stop is not written yet");

export default stop;
