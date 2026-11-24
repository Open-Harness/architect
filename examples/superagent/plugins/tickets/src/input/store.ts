import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/input/verbs/store.ts";

/** Store a message for a ticket's executor: a person's, or a followed thread's trigger. Not written yet: slice 7 gives it its body. */
const store: Handler<typeof declaration> = () => Handlers.blank("input.store is not written yet");

export default store;
