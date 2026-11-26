import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/trigger/verbs/requeue.ts";

/** Put a trigger back for evaluation. Not written yet: slice 7 gives it its body. */
const requeue: Handler<typeof declaration> = () => Handlers.blank("trigger.requeue is not written yet");

export default requeue;
