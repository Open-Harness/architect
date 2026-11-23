import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/proposal/verbs/approve.ts";

/** Apply a proposal. Only a signed-in person, through a session: text that reached a model is never an approval. Not written yet: slice 7 gives it its body. */
const approve: Handler<typeof declaration> = () => Handlers.blank("proposal.approve is not written yet");

export default approve;
