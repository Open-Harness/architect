import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/input/verbs/requeue.ts";

/** Put a refused or failed Input back to waiting, after a short wait that grows with each refusal. Not written yet: slice 7 gives it its body. */
const requeue: Handler<typeof declaration> = () => Handlers.blank("input.requeue is not written yet");

export default requeue;
