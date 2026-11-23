import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/input/verbs/delivered.ts";

/** The executor took the Input. Not written yet: slice 7 gives it its body. */
const delivered: Handler<typeof declaration> = () => Handlers.blank("input.delivered is not written yet");

export default delivered;
