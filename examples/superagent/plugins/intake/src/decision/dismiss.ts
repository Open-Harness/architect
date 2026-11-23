import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/decision/verbs/dismiss.ts";

/** Set aside a decision a person disagrees with. Not written yet: slice 7 gives it its body. */
const dismiss: Handler<typeof declaration> = () => Handlers.blank("decision.dismiss is not written yet");

export default dismiss;
