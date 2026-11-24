import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/source/verbs/save.ts";

/** Save a connection: its kind and its configuration. Not written yet: slice 7 gives it its body. */
const save: Handler<typeof declaration> = () => Handlers.blank("source.save is not written yet");

export default save;
