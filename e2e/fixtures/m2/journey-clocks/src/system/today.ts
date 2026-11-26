// Written by m2 check 12's author: the server's own clock, which a stepped world sets (K23).
import { Clock, Effect } from "effect";
import type { Handler } from "../../generated/api/src/system/today.handler.ts";

const today: Handler = () => Effect.map(Clock.currentTimeMillis, (millis) => ({ clock: BigInt(millis) }));

export default today;
