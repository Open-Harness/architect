import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/agent/verbs/close.ts";

/** Stop an agent's turn for one Assignment and say so: the seat that held it is then free. Not written yet: slice 7 gives it its body. */
const close: Handler<typeof declaration> = () => Handlers.blank("agent.close is not written yet");

export default close;
