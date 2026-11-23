import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/thread/verbs/follow.ts";

/** The executor follows a thread: its next messages go straight to it, with no eval. Not written yet: slice 7 gives it its body. */
const follow: Handler<typeof declaration> = () => Handlers.blank("thread.follow is not written yet");

export default follow;
