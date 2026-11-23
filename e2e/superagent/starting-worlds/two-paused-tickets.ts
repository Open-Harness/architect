import { Blueprint } from "orthograph";
import { ticketAccept, listed } from "../../kit/ops.ts";
import { acceptOf } from "../../kit/steps.ts";
import { SLACK_THREAD_TWO } from "../../kit/consts.ts";

/** Two tickets in line for a pool of one seat, the first accepted first, the superagent still paused. `ticket` is the first, `second` the other. */
export default Blueprint.startingWorld("two-paused-tickets", {
  from: "a-second-executor-waits",
  cast: { gh: listed },
  makes: (s) => [s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executorTwo, thread: SLACK_THREAD_TWO, title: "Fix the signup test", text: "<@U0BOT0001> fix the signup test" }))],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.world.account, executor: s.world.executor, executorTwo: s.world.executorTwo, ticket: s.world.ticket, second: s.last.ticket }),
});
