import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/started.ts";

/** Give a waiting Assignment a seat, if one is free for it. Not written yet: slice 7 gives it its body. */
const started: Handler<typeof declaration> = () => Handlers.blank("assignment.started is not written yet");

export default started;
