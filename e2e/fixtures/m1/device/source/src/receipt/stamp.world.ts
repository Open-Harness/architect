// receipt.stamp on the world host (a journey's actor, in a local world). No Node import.
import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/receipt/verbs/stamp.js";

const handler: Handler<typeof declaration> = ({ text }, { steps }) =>
  Effect.gen(function* () {
    const prepared = yield* steps.prepare(Effect.succeed(text.trim().toLowerCase()));
    const reversed = yield* steps.seal(Effect.sync(() => [...prepared].reverse().join("")));
    return { stamp: `world:${reversed}`, host: "world" };
  });

export default handler;
