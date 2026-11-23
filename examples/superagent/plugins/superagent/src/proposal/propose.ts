import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/proposal/verbs/propose.ts";

/** Record what a main agent would change, and why: nothing changes until a person approves it. Not written yet: slice 7 gives it its body. */
const propose: Handler<typeof declaration> = () => Handlers.blank("proposal.propose is not written yet");

export default propose;
