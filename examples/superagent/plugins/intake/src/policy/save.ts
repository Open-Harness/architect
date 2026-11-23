import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/policy/verbs/save.ts";

/** Save a new version of the policy. A save made from an older version is refused, with the current one. Not written yet: slice 7 gives it its body. */
const save: Handler<typeof declaration> = () => Handlers.blank("policy.save is not written yet");

export default save;
