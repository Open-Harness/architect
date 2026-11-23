import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/cancelled.ts";

/** End a pending Assignment that was never seated or told. Not written yet: slice 7 gives it its body. */
const cancelled: Handler<typeof declaration> = () => Handlers.blank("assignment.cancelled is not written yet");

export default cancelled;
