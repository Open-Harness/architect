import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/pause.ts";

/** Hold evals, launches, deliveries and replies; sources keep recording. Only a person, through a session. Not written yet: slice 7 gives it its body. */
const pause: Handler<typeof declaration> = () => Handlers.blank("superagent.pause is not written yet");

export default pause;
