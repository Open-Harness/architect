import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/interrupted.ts";

/** Close a running Assignment: a stop, a retire or a reap. It keeps its seat until the Agent says it closed. Not written yet: slice 7 gives it its body. */
const interrupted: Handler<typeof declaration> = () => Handlers.blank("assignment.interrupted is not written yet");

export default interrupted;
