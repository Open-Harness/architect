import { Source } from "orthograph";

/** A source with no adapter: each tick of `every` is a trigger saying `says`, on a thread that never closes. A standing goal. */
export const timerSource = Source.timer;
