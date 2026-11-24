import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/update.ts";

/** Save a superagent's configuration as a new version; a stale save is refused. Not written yet: slice 7 gives it its body. */
const update: Handler<typeof declaration> = () => Handlers.blank("superagent.update is not written yet");

export default update;
