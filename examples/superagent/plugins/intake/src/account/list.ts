import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/account/verbs/list.ts";

/** Let an account ask: its person's words may then start work. Not written yet: slice 7 gives it its body. */
const list: Handler<typeof declaration> = () => Handlers.blank("account.list is not written yet");

export default list;
