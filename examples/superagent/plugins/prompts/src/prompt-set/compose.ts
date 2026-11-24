import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/prompt-set/verbs/compose.ts";

/** Make the prompt for one agent's model request, from the current version. Not written yet: slice 7 gives it its body. */
const compose: Handler<typeof declaration> = () => Handlers.blank("prompt-set.compose is not written yet");

export default compose;
