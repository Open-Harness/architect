import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/eval/verbs/context.ts";

/** Read what a judgement needs: the thread's history and what else it touches. Not written yet: slice 7 gives it its body. */
const context: Handler<typeof declaration> = () => Handlers.blank("eval.context is not written yet");

export default context;
