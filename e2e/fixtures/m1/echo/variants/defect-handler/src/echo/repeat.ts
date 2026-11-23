// Planted: a handler that dies.
import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/echo/verbs/repeat.js";

const repeat: Handler<typeof declaration> = () => Effect.die(new Error("authored feature repeat defect"));

export default repeat;
