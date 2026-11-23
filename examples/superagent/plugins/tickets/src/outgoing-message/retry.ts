import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/outgoing-message/verbs/retry.ts";

/** Queue a failed reply again, once its wait has passed. Not written yet: slice 7 gives it its body. */
const retry: Handler<typeof declaration> = () => Handlers.blank("outgoing-message.retry is not written yet");

export default retry;
