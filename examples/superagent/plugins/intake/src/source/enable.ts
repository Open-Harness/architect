import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/source/verbs/enable.ts";

/** Start listening on a connection. Not written yet: slice 7 gives it its body. */
const enable: Handler<typeof declaration> = () => Handlers.blank("source.enable is not written yet");

export default enable;
