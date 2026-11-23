import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/end.ts";

/** End a ticket: the reported work is ready, its threads are closed, or the playbook says so. Its executor stays, idle. Not written yet: slice 7 gives it its body. */
const end: Handler<typeof declaration> = () => Handlers.blank("ticket.end is not written yet");

export default end;
