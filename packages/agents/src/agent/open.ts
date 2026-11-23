import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/agent/verbs/open.ts";

/** Make an agent of one kind, about one thing: any operation allowed to create one makes it. Not written yet: slice 7 gives it its body. */
const open: Handler<typeof declaration> = () => Handlers.blank("agent.open is not written yet");

export default open;
