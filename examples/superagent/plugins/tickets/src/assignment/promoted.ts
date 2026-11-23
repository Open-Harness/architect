import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/assignment/verbs/promoted.ts";

/** A person's Input on a pending Assignment moves it up: its reason becomes a person's. Not written yet: slice 7 gives it its body. */
const promoted: Handler<typeof declaration> = () => Handlers.blank("assignment.promoted is not written yet");

export default promoted;
