import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/account/verbs/seen.ts";

/** Record an account an event came from: a new one is seen, a known one keeps its state. Not written yet: slice 7 gives it its body. */
const seen: Handler<typeof declaration> = () => Handlers.blank("account.seen is not written yet");

export default seen;
