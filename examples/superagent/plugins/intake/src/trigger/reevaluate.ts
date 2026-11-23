import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/trigger/verbs/reevaluate.ts";

/** Ask the main agent to judge a trigger again. Not written yet: slice 7 gives it its body. */
const reevaluate: Handler<typeof declaration> = () => Handlers.blank("trigger.reevaluate is not written yet");

export default reevaluate;
