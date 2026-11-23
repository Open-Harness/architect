// Slice 8: "a stopped ticket does not get a seat back". GOAL17-executor-slots, section 5: a stop closes its Assignment (running to closing to ended),
// and a message that arrives after it queues nothing: `route` queues no Assignment for a ticket that is not open.
import { Blueprint, emits, expect } from "orthograph";
import { models, outbox } from "../kit/doors.ts";
import { AssignmentInterrupted, AssignmentEnded, InputStored, superagentResume, ticketStop, inputStore, assignmentWaiting } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";
import { SLACK_THREAD } from "../kit/consts.ts";

export default Blueprint.journey("a stopped ticket does not get a seat back", {
  cast: { ann: Blueprint.signedIn, sys: Blueprint.system },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the executor's turn stays open at the model", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Working.", "before-reply")] })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the executor is running in seat one", s.clock.settle()),
    s.step("ann stops the ticket: its Assignment is closing and keeps the seat until the Agent says so", s.ann.run(ticketStop, { superagent: s.world.superagent, ticket: s.world.ticket }),
      emits(AssignmentInterrupted, { seat: 1n })),
    s.step("the Agent closed it, and the seat is free", s.clock.settle(), emits(AssignmentEnded, { seat: 1n })),
    s.step("a person writes on the stopped ticket's thread", s.sys.run(inputStore, { superagent: s.world.superagent, thread: SLACK_THREAD, from: "person", text: "please carry on" }), emits(InputStored, { ticket: s.world.ticket })),
    s.step("the world settles and a minute passes: the sweep too", s.clock.advance("1 minute")),
    s.step("no Assignment was queued by the message", outbox.rows({ name: "AssignmentQueued", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
    s.step("nothing waits for a seat", s.sys.run(assignmentWaiting, { superagent: s.world.superagent }), expect((a) => a.items.length).toBe(0)),
    s.step("and only the one seating ever happened", outbox.rows({ name: "AssignmentStarted", to: "op:agent.tell", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
  ],
});
