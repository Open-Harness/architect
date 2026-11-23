import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/policy/verbs/restore.ts";

/** Save an earlier version again, as a new one. Not written yet: slice 7 gives it its body. */
const restore: Handler<typeof declaration> = () => Handlers.blank("policy.restore is not written yet");

export default restore;
