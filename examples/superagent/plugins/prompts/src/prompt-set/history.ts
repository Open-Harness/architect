import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/prompt-set/verbs/history.ts";

/** Every saved version, newest first, each row its number, when, by whom, and the one it was made from. Not written yet: slice 7 gives it its body. */
const history: Handler<typeof declaration> = () => Handlers.blank("prompt-set.history is not written yet");

export default history;
