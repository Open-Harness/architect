import { Blueprint } from "orthograph";
import superagentPause from "@orthograph/superagent/blueprint/things/superagent/verbs/pause.ts";
import ticketAccept from "@orthograph/tickets/blueprint/things/ticket/verbs/accept.ts";
import { listed } from "@orthograph/intake/blueprint/things/account/roles.ts";

/**
 * A live superagent with one ticket, on issue 12 of acme/widgets, that has not started: the superagent is paused as the ticket is
 * accepted, so its Assignment is queued and holds no seat (GOAL17-pause: a held launch takes no seat), exactly as slice 8's
 * `a-paused-ticket` does it, on a GitHub thread. Resuming starts the executor's first model turn, and a world cannot script a model,
 * so the journey scripts its turn first (`models.script`) and then resumes. The ticket's id is `s.world.ticket`.
 */
export default Blueprint.startingWorld("a-live-superagent-with-a-ticket", {
  from: "reply-an-executor-waits",
  cast: { ann: Blueprint.signedIn, gh: listed },
  makes: (s) => [
    s.ann.run(superagentPause, { superagent: s.world.superagent }),
    s.gh.run(ticketAccept, {
      superagent: s.world.superagent, account: s.world.account, title: "Fix the flaky login test",
      agent: s.world.executor, thread: "issue/12", text: "@agent fix the flaky login test",
    }),
  ],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.world.account, executor: s.world.executor, ticket: s.last.ticket }),
});
