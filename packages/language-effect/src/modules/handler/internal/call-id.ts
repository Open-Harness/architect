// The name of one call (O3): made once, before its first attempt, from Effect's own Random (so a world can seed it), and written on every
// span of the call's attempts as `call.id`. A reader groups attempts by it; nothing else in a trace says which attempts belong together.
import { Ids } from "#modules/ids/service.js";

export const CALL_ID = "call.id";

export const newCallId = Ids.make("call");
