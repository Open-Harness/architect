import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/input/verbs/route.ts";

/** Send a waiting Input to its running executor, or queue the Assignment that will start one. Not written yet: slice 7 gives it its body. */
const route: Handler<typeof declaration> = () => Handlers.blank("input.route is not written yet");

export default route;
