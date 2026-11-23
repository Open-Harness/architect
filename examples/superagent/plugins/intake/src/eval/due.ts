import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/eval/verbs/due.ts";

/** One pass of the eval clock: batch each thread's waiting triggers into an eval, and expire the ones that ran out of time. Not armed again while paused. Not written yet: slice 7 gives it its body. */
const due: Handler<typeof declaration> = () => Handlers.blank("eval.due is not written yet");

export default due;
