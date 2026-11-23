import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/create.ts";

/** Make a superagent, with its main agent, observing. Not written yet: slice 7 gives it its body. */
const create: Handler<typeof declaration> = () => Handlers.blank("superagent.create is not written yet");

export default create;
