import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/agent/verbs/tell.ts";

/** Give an agent one input, steering it when it is busy. Only an outbox hop calls it, with the delivering event's id as the request id. Not written yet: slice 7 gives it its body. */
const tell: Handler<typeof declaration> = () => Handlers.blank("agent.tell is not written yet");

export default tell;
