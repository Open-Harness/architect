// Slice 8: "a full pool keeps its slot for a person". GOAL17-executor-slots, sections 2 and 9, with a pool of one seat (the worlds' size):
// the pool's seat is held, a person's message to a waiting ticket takes the reserve (seat 255), a second person's waits ahead of an
// older launch, and when the pool's seat frees it goes to that person, not the launch. Every turn is held at the model, so the pool
// stays full as long as the script wants and no wall clock is read. No ticket's id is needed: a thread names its ticket.
import { Blueprint, emits, expect } from "orthograph";
import { models, outbox } from "../kit/doors.ts";
import { InputStored, AssignmentQueued, AssignmentStarted, AssignmentPromoted, ticketAccept, inputStore, assignmentWaiting, agentOpen, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnSay } from "../kit/steps.ts";

const person = (s: { world: Record<string, unknown> }, thread: string, text: string) => ({ superagent: s.world["superagent"], thread, from: "person", text });

export default Blueprint.journey("a full pool keeps its slot for a person", {
  cast: { gh: listed, sys: Blueprint.system },
  starts: "a-listed-account",
  steps: (s) => [
    s.step("the turns of the first and the fourth ticket stay open at the model, are asked again after the restart, and the third's opens after them", models.script({ for: { kind: "executor" }, turns: [turnSay("a.", "before-reply"), turnSay("m.", "before-reply"), turnSay("a, asked again.", "before-reply"), turnSay("m, asked again.", "before-reply"), turnSay("l.", "before-reply")] })),
    s.step("an executor for the first ticket", s.sys.run(agentOpen, { kind: "executor", about: "ticket/a" })),
    s.step("the first ticket takes the pool's one seat", s.gh.run(ticketAccept, acceptOf(s, { agent: s.last.agent, thread: "issue/1" })), emits(AssignmentQueued, { why: "launch" })),
    s.step("seated at once, in seat one", s.clock.settle(), emits(AssignmentStarted, { seat: 1n, why: "launch" })),
    s.step("an executor for the second ticket", s.sys.run(agentOpen, { kind: "executor", about: "ticket/x" })),
    s.step("the second ticket waits: the pool is full", s.gh.run(ticketAccept, acceptOf(s, { agent: s.last.agent, thread: "issue/2" })), emits(AssignmentQueued, { why: "launch" })),
    s.step("an executor for the third ticket", s.sys.run(agentOpen, { kind: "executor", about: "ticket/l" })),
    s.step("the third waits too", s.gh.run(ticketAccept, acceptOf(s, { agent: s.last.agent, thread: "issue/3" })), emits(AssignmentQueued, { why: "launch" })),
    s.step("an executor for the fourth ticket", s.sys.run(agentOpen, { kind: "executor", about: "ticket/m" })),
    s.step("the fourth waits too", s.gh.run(ticketAccept, acceptOf(s, { agent: s.last.agent, thread: "issue/4" })), emits(AssignmentQueued, { why: "launch" })),
    s.step("the world settles: three wait, none started", s.clock.settle()),
    s.step("three launches wait, oldest first", s.sys.run(assignmentWaiting, { superagent: s.world.superagent }),
      expect((a) => a.items.map((i: { why: string }) => i.why)).toEqual(["launch", "launch", "launch"])),
    s.step("a person writes on the fourth ticket: it moves up", s.sys.run(inputStore, person(s, "issue/4", "ann here: please start with this one")), emits(InputStored, {})),
    s.step("the pool is full, so the reserve answers the person at once", s.clock.settle(), emits(AssignmentPromoted, {}), emits(AssignmentStarted, { seat: 255n, why: "person" })),
    s.step("a person writes on the third ticket", s.sys.run(inputStore, person(s, "issue/3", "and this one too")), emits(InputStored, {})),
    s.step("the reserve is held, so the second person waits", s.clock.settle(), emits(AssignmentPromoted, {})),
    s.step("the waiting line is the person first, then the older launch", s.sys.run(assignmentWaiting, { superagent: s.world.superagent }),
      expect((a) => a.items.map((i: { why: string }) => i.why)).toEqual(["person", "launch"])),
    s.step("a restart changes none of it", s.runner.restart()),
    s.step("the world settles after the restart", s.clock.settle()),
    s.step("still the person first, then the launch", s.sys.run(assignmentWaiting, { superagent: s.world.superagent }),
      expect((a) => a.items.map((i: { why: string }) => i.why)).toEqual(["person", "launch"])),
    s.step("the models are let go: the first and fourth turns end", models.release({ hold: "all" })),
    s.step("the pool's seat goes to the person, not to the older launch", s.clock.settle(), emits(AssignmentStarted, { seat: 1n, why: "person" })),
    s.step("both seats were freed: the pool's and the reserve", outbox.rows({ name: "AssignmentEnded", to: "op:superagent.fill", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(2)),
    s.step("the older launch is still waiting: the reserve is a person's alone", s.sys.run(assignmentWaiting, { superagent: s.world.superagent }),
      expect((a) => a.items.map((i: { why: string }) => i.why)).toEqual(["launch"])),
  ],
});
