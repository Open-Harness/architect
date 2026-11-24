import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/eval/verbs/read.ts";

/** Read one page of a thread, through its connection. Not written yet: slice 7 gives it its body. */
const read: Handler<typeof declaration> = () => Handlers.blank("eval.read is not written yet");

export default read;
