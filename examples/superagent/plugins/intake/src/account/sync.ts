import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/account/verbs/sync.ts";

/** List the accounts a connection's own roster names: a repository's collaborators, a user group. Not written yet: slice 7 gives it its body. */
const sync: Handler<typeof declaration> = () => Handlers.blank("account.sync is not written yet");

export default sync;
