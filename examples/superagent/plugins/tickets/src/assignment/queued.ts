import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/queued.ts";

/** Queue an Assignment for a ticket's executor: an accept, an Input or a resume. It names the Input that woke it. Not written yet: slice 7 gives it its body. */
const queued: Handler<typeof declaration> = () => Handlers.blank("assignment.queued is not written yet");

export default queued;
