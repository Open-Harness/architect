import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/eval/verbs/start.ts";

/** Make an eval for one thread's waiting triggers. Not written yet: slice 7 gives it its body. */
const start: Handler<typeof declaration> = () => Handlers.blank("eval.start is not written yet");

export default start;
