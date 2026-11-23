import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/thread/verbs/unsubscribe.ts";

/** Stop a ticket following a thread: a person's call, or the main agent's. Not written yet: slice 7 gives it its body. */
const unsubscribe: Handler<typeof declaration> = () => Handlers.blank("thread.unsubscribe is not written yet");

export default unsubscribe;
