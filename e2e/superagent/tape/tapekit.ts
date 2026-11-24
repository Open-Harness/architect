// What every tape writes the same way: the shapes the harness record gives its probes' answers (GOAL17-check-harness calls 1, 3, 4, 5).
import type { Row, Told, ModelStep } from "../kit/doors.ts";

/** The world a tape starts from: what the starting worlds give, as ids. */
export const WORLD = { main: "agt_main", superagent: "sag_1", account: "acc_ann", executor: "agt_one", executorTwo: "agt_two", ticket: "tkt_one", second: "tkt_two" };

let seq = 100;
/** One outbox row. `due` is an instant on the world's clock; `seq` is its event's journal position, which no check reads. */
export const row = (name: string, to: string, o: Partial<Row> = {}): Row =>
  ({ event: `evt_${name}_${seq}`, name, to, subject: `sub_${name}`, seq: seq++, state: "delivered", attempts: 1, due: "2026-12-01T09:00:00.000Z", hold: null, outcome: null, ...o });
export const told = (text: string, how: Told["how"] = "submitted", assignment: string | null = "asg_1"): Told => ({ requestId: `req_${text.length}_${how}`, text, assignment, how });
export const step = (round: number, text: string): ModelStep => ({ requestId: `req_${round}_${text.length}`, round, tools: [], text });
export const ASK = "@agent fix the flaky login test";
export const SLACK_ASK = "<@U0BOT0001> fix the flaky login test";
export const ASK_SLACK = SLACK_ASK;
