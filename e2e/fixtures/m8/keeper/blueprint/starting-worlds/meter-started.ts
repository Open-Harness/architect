// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import start from "../things/meter/verbs/start.ts";

/** Aaron started the meter the moment the world started, at nine: the keeper reads it at ten, eleven, and on. */
export default Blueprint.startingWorld("meter-started", {
  cast: { aaron: Blueprint.anyone },
  makes: (s) => [s.aaron.run(start, { name: "Gas" })],
  gives: (s) => ({ meter: s.last.meter }),
});
