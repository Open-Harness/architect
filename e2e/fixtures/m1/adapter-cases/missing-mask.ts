// Independently planted wrong runner. It still performs the actual HTTP request, but it releases counted work on
// interruption, before the raw wait settles: the instrument in check 04 must catch exactly that.
import { Effect } from "effect";
import { Busy } from "@orthograph/language-effect";

export const missingMask = <A>(call: () => Promise<A>) =>
  Effect.flatMap(Busy, (busy) => busy.counted(Effect.tryPromise({ try: call, catch: (error) => error })));
