import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/boot.ts";

/** The world's once-a-minute backstop: arm each live superagent's eval pass and sweeps that a restart lost. Not written yet: slice 7 gives it its body. */
const boot: Handler<typeof declaration> = () => Handlers.blank("superagent.boot is not written yet");

export default boot;
