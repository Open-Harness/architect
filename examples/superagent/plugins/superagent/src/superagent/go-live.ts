import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/go-live.ts";

/** Let a superagent act: a person, after reading what it would have accepted. Not written yet: slice 7 gives it its body. */
const goLive: Handler<typeof declaration> = () => Handlers.blank("superagent.go-live is not written yet");

export default goLive;
