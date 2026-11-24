import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/outgoing-message/verbs/send.ts";

/** Send a conversation's head through its connection. A failed call is counted and queued again; the outbox always sees a success. Not written yet: slice 7 gives it its body. */
const send: Handler<typeof declaration> = () => Handlers.blank("outgoing-message.send is not written yet");

export default send;
