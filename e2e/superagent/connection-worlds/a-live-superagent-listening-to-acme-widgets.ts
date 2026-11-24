import { Blueprint } from "orthograph";

/** The coder is live, and ann (GitHub 583231) is a listed account of it: a mention of hers on acme/widgets may start work. It is `reply-a-listed-account` as it stands. */
export default Blueprint.startingWorld("a-live-superagent-listening-to-acme-widgets", {
  from: "reply-a-listed-account",
  cast: {},
  makes: () => [],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent }),
});
