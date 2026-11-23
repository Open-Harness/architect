import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/turn-ended.ts";

/** The Agent idled on this Assignment or closed it: it ends, and its seat is free. Not written yet: slice 7 gives it its body. */
const turnEnded: Handler<typeof declaration> = () => Handlers.blank("assignment.turn-ended is not written yet");

export default turnEnded;
