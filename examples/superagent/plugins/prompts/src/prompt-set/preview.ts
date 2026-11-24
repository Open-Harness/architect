import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/prompt-set/verbs/preview.ts";

/** Show the prompt an agent of one kind would get, with a draft applied. Not written yet: slice 7 gives it its body. */
const preview: Handler<typeof declaration> = () => Handlers.blank("prompt-set.preview is not written yet");

export default preview;
