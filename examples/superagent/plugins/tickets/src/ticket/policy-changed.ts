import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/policy-changed.ts";

/** Tell the live tickets the policy changed under them. Not written yet: slice 7 gives it its body. */
const policyChanged: Handler<typeof declaration> = () => Handlers.blank("ticket.policy-changed is not written yet");

export default policyChanged;
