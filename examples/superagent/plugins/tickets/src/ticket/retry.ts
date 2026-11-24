import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/retry.ts";

/** Send a failed input again. Not written yet: slice 7 gives it its body. */
const retry: Handler<typeof declaration> = () => Handlers.blank("ticket.retry is not written yet");

export default retry;
