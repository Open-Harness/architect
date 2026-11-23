import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/input/verbs/read.ts";

/** Read one Input's text. Not written yet: slice 7 gives it its body. */
const read: Handler<typeof declaration> = () => Handlers.blank("input.read is not written yet");

export default read;
