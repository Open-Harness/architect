import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/trigger/verbs/handback.ts";

/** The executor hands a trigger back: it was not its to answer. Not written yet: slice 7 gives it its body. */
const handback: Handler<typeof declaration> = () => Handlers.blank("trigger.handback is not written yet");

export default handback;
