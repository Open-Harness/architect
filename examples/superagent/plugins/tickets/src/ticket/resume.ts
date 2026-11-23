import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/resume.ts";

/** Wake an ended ticket on a person's message, after its mandate is revalidated: the same executor, with its memory. Not written yet: slice 7 gives it its body. */
const resume: Handler<typeof declaration> = () => Handlers.blank("ticket.resume is not written yet");

export default resume;
