import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/ack.ts";

/** The executor acknowledges the message it was woken by, once, in one short reply. Not written yet: slice 7 gives it its body. */
const ack: Handler<typeof declaration> = () => Handlers.blank("ticket.ack is not written yet");

export default ack;
