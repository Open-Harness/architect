// receipt.stamp on the Node host (the CLI, and the SDK run from Node). A real Node builtin: it must never enter a worker,
// api or browser closure.
import { createHash } from "node:crypto";
import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/receipt/verbs/stamp.js";

const handler: Handler<typeof declaration> = ({ text }, { steps }) =>
  Effect.gen(function* () {
    const prepared = yield* steps.prepare(Effect.succeed(text.trim().toLowerCase()));
    const digest = yield* steps.seal(Effect.sync(() => createHash("sha256").update(prepared).digest("hex").slice(0, 16)));
    return { stamp: `node:${digest}`, host: "node" };
  });

export default handler;
