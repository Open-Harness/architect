import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/policy/verbs/history.ts";

/** Every saved version, newest first: its number, when, by whom, and the one it was made from. One list for each, in step. Not written yet: slice 7 gives it its body. */
const history: Handler<typeof declaration> = () => Handlers.blank("policy.history is not written yet");

export default history;
