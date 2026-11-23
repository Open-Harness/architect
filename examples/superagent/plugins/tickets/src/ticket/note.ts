import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/note.ts";

/** Write a note on a ticket that does not wake its executor. Not written yet: slice 7 gives it its body. */
const note: Handler<typeof declaration> = () => Handlers.blank("ticket.note is not written yet");

export default note;
