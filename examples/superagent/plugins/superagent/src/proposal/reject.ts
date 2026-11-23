import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/proposal/verbs/reject.ts";

/** Turn a proposal down. Not written yet: slice 7 gives it its body. */
const reject: Handler<typeof declaration> = () => Handlers.blank("proposal.reject is not written yet");

export default reject;
