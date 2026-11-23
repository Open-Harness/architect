import { Effect } from "effect";
import { Mount, type Handler } from "@orthograph/language-effect";
import { style } from "../../blueprint/choices.js";
import type declaration from "../../blueprint/things/echo/verbs/shout.js";

const shout: Handler<typeof declaration> = ({ text }) =>
  Effect.gen(function* () {
    const loud = yield* Mount.picked(style.loud);
    return { text: `${text.toUpperCase()}${loud ? "!!!" : "!"}` };
  });

export default shout;
