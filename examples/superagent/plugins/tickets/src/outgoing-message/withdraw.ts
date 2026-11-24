import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/outgoing-message/verbs/withdraw.ts";

/** Drop a ticket's pending replies: it ended, or its superagent retired. Not written yet: slice 7 gives it its body. */
const withdraw: Handler<typeof declaration> = () => Handlers.blank("outgoing-message.withdraw is not written yet");

export default withdraw;
