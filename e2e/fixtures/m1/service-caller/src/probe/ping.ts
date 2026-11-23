import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/probe/ping.handler.ts";

/** Answering at all says the caller was let in; the runtime decided that before this ran. */
const ping: Handler = () => Effect.succeed({ status: "ok" as const });

export default ping;
