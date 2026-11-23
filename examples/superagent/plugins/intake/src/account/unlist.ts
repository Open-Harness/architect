import { Handlers, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/account/verbs/unlist.ts";

/** Stop letting an account ask. Not written yet: slice 7 gives it its body. */
const unlist: Handler<typeof declaration> = () => Handlers.blank("account.unlist is not written yet");

export default unlist;
