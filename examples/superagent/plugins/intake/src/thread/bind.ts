import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/thread/verbs/bind.ts";

/** Make the thread an event belongs to, once, for this superagent. Not written yet: slice 7 gives it its body. */
const bind: Handler<typeof declaration> = () => Handlers.blank("thread.bind is not written yet");

export default bind;
