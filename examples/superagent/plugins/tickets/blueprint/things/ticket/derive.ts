import { Blueprint } from "orthograph";
import { Ticket } from "./thing.ts";
import { Report } from "../report/thing.ts";
import { Assignment } from "../assignment/thing.ts";
import { Attention } from "../attention/thing.ts";
import { Input } from "../input/thing.ts";
import { stageOf } from "../../../src/modules/stage/service.ts";

/** The stage table, once: who a ticket waits for, and why. Its two reads, `ticket.stage` and `ticket.waiting`, share it. */
export const Stage = Blueprint.derive(Ticket, {
  looks: {
    report: Blueprint.newest(Report, { by: Report.fields.ticket }),
    assignment: Blueprint.newest(Assignment, { by: Assignment.fields.ticket }),
    attention: Blueprint.newest(Attention, { by: Attention.fields.ticket, state: "open" }),
    undelivered: Blueprint.newest(Input, { by: Input.fields.ticket, state: "failed" }),
    person: Blueprint.newest(Input, { by: Input.fields.ticket, where: { from: "person" } }),
  },
  adds: {
    stage: Blueprint.oneOf(["person", "working", "idle", "ended"]),
    why: Blueprint.oneOf(["delivery", "answer", "review", "blocked", "failed", "queued", "none"]),
    label: Blueprint.text({ max: 40 }),
  },
  is: stageOf,
});
