import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/trigger/verbs/receive.ts";

/** Store one event a connection brought, once: a second delivery of the same event is a duplicate, and one the policy filters is not kept. Not written yet: slice 7 gives it its body. */
const receive: Handler<typeof declaration> = () => Handlers.blank("trigger.receive is not written yet");

export default receive;
