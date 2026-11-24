import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/policy/verbs/sync.ts";

/** List the accounts a connection's roster names. Not written yet: slice 7 gives it its body. */
const sync: Handler<typeof declaration> = () => Handlers.blank("policy.sync is not written yet");

export default sync;
