import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/source/verbs/disable.ts";

/** Stop listening on a connection; its triggers already recorded stay. Not written yet: slice 7 gives it its body. */
const disable: Handler<typeof declaration> = () => Handlers.blank("source.disable is not written yet");

export default disable;
