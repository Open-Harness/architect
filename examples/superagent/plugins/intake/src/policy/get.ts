import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/policy/verbs/get.ts";

/** Read the policy: the current version, or the one named. Not written yet: slice 7 gives it its body. */
const get: Handler<typeof declaration> = () => Handlers.blank("policy.get is not written yet");

export default get;
