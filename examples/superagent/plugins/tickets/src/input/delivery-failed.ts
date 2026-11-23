import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/input/verbs/delivery-failed.ts";

/** The outbox gave up telling the executor: the Input failed, and the stage table says "Input undelivered" until a person retries it. */
const deliveryFailed: Handler<typeof declaration> = (_payload, { move }) => Effect.as(move(), {});

export default deliveryFailed;
