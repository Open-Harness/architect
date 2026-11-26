import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/outgoing-message/verbs/reply.ts";

/** Queue a reply: by purpose, in order within its conversation. Only the head of a conversation has an outbox row. Not written yet: slice 7 gives it its body. */
const reply: Handler<typeof declaration> = () => Handlers.blank("outgoing-message.reply is not written yet");

export default reply;
