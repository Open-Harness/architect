import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/eval/verbs/decide.ts";

/** Record one judgement per enabled rule. Not written yet: slice 7 gives it its body. */
const decide: Handler<typeof declaration> = () => Handlers.blank("eval.decide is not written yet");

export default decide;
