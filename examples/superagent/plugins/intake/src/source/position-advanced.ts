import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/source/verbs/position-advanced.ts";

/** Record how far a connection has read, after a poll. Not written yet: slice 7 gives it its body. */
const positionAdvanced: Handler<typeof declaration> = () => Handlers.blank("source.position-advanced is not written yet");

export default positionAdvanced;
