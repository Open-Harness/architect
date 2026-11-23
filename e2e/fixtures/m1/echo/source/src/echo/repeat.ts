// The handler of echo.repeat, on the worker host: found by its path, default export. No Node import.
import { Effect } from "effect";
import { Mount, type Handler } from "@orthograph/language-effect";
import { style } from "../../blueprint/choices.js";
import type declaration from "../../blueprint/things/echo/verbs/repeat.js";

const repeat: Handler<typeof declaration> = ({ text }) =>
  Effect.gen(function* () {
    const loud = yield* Mount.picked(style.loud);
    return { text: loud ? text.toUpperCase() : text };
  });

export default repeat;
