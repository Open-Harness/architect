// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import start from "../things/watch/verbs/start.ts";

/** Aaron started the watch the moment the world started, at nine: its first check is due at ten. */
export default Blueprint.startingWorld("watch-started", {
  cast: { aaron: Blueprint.anyone },
  makes: (s) => [s.aaron.run(start, { name: "Deploy" })],
  gives: (s) => ({ watch: s.last.watch }),
});
