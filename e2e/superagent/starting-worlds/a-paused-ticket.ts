import { Blueprint } from "orthograph";
import { superagentPause, ticketAccept, listed } from "../../kit/ops.ts";
import { acceptOf } from "../../kit/steps.ts";
import { SLACK_THREAD } from "../../kit/consts.ts";

/**
 * A ticket whose Assignment is queued and holds no seat, because the superagent is paused (GOAL17-pause: a held launch takes no seat).
 * A journey scripts its model and its holds, then resumes: the ticket's id is known (`s.world.ticket`) and nothing has run yet.
 * Its thread is a Slack thread, so its replies are Slack's.
 */
export default Blueprint.startingWorld("a-paused-ticket", {
  from: "an-executor-waits",
  cast: { ann: Blueprint.signedIn, gh: listed },
  makes: (s) => [
    s.ann.run(superagentPause, { superagent: s.world.superagent }),
    s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor, thread: SLACK_THREAD, text: "<@U0BOT0001> fix the flaky login test" })),
  ],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.world.account, executor: s.world.executor, ticket: s.last.ticket }),
});
