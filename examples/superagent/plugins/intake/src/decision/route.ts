import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/decision/verbs/route.ts";

/** Route an eval's items: one to twenty, each accept, attach, stop or ignore. In observe an accept is only recorded as one it would make. Not written yet: slice 7 gives it its body. */
const route: Handler<typeof declaration> = () => Handlers.blank("decision.route is not written yet");

export default route;
