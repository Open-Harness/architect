import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/thread/verbs/closed.ts";

/** Say a thread closed: a merged pull request, a closed issue. Not written yet: slice 7 gives it its body. */
const closed: Handler<typeof declaration> = () => Handlers.blank("thread.closed is not written yet");

export default closed;
