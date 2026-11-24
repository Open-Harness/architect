import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/thread/verbs/unrelated.ts";

/** The executor says a thread has nothing to do with its ticket. Not written yet: slice 7 gives it its body. */
const unrelated: Handler<typeof declaration> = () => Handlers.blank("thread.unrelated is not written yet");

export default unrelated;
