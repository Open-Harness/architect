import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/eval/verbs/delivered.ts";

/** Start an eval's clock when it is told to the main agent: a held hop, so a pause never starts it. Not written yet: slice 7 gives it its body. */
const delivered: Handler<typeof declaration> = () => Handlers.blank("eval.delivered is not written yet");

export default delivered;
