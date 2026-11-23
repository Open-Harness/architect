import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/retire.ts";

/** Close a superagent's connections and agents. Not written yet: slice 7 gives it its body. */
const retire: Handler<typeof declaration> = () => Handlers.blank("superagent.retire is not written yet");

export default retire;
