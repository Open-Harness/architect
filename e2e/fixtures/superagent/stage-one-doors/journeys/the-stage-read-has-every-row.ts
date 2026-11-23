// Checks-author file (Goal 17, slice 6). A builder never edits it. Written against GOAL17-check-harness's doors; see `22-stage-one-doors`.
// The stage read, through the served read, over one ticket's life: queued (its seat is held back), working (the executor runs), awaiting review
// (it reports ready), ended (a stop). `20` judges every row of the table; this is the read served over real records, and `ticket.waiting` lists
// the ticket only while its stage is a person's. Each read is preceded by the ticket's outbox row, which says which ticket it is
// (GOAL17-check-harness, `OutboxRow.subject`).
import { Blueprint, expect, outbox } from "orthograph";
import { models } from "@orthograph/stand-in-model/stand";
import stage from "@orthograph/tickets/blueprint/things/ticket/verbs/stage.ts";
import waiting from "@orthograph/tickets/blueprint/things/ticket/verbs/waiting.ts";
import stop from "@orthograph/tickets/blueprint/things/ticket/verbs/stop.ts";

const row = { name: "TicketCreated", afterSeq: "journey" } as const;

export default Blueprint.journey("the stage read has every row", {
  cast: { ada: Blueprint.signedIn },
  starts: "a-trigger-was-received",
  steps: (s) => [
    s.step("the main agent is scripted to accept ann's ask", models.script({ for: { kind: "main" }, turns: [
      { call: [{ tool: "decision.route", args: { eval: "$eval", items: [{ action: "accept", trigger: s.world.trigger, title: "fix the flaky login test" }] } }] }, { say: "Accepted." } ] })),
    s.step("the seat sweep is held back", outbox.hold({ name: "AssignmentQueued", to: "op:superagent.fill" })),
    s.step("the eval pass runs and the ticket is made", s.clock.advance("5 seconds")),
    s.step("the world settles", s.clock.settle()),
    s.step("the ticket whose assignment has no seat: its row", outbox.rows(row)),
    s.step("a ticket whose assignment has no seat is queued", s.ada.run(stage, { id: s.last.rows[0].subject }), expect((a) => [a.stage, a.why, a.label]).toEqual(["working", "queued", "Queued"])),
    s.step("the executor will hold its first turn open, then report ready", models.script({ for: { kind: "executor" }, turns: [
      { say: "Working.", hold: "before-reply" }, { call: [{ tool: "ticket.report", args: { kind: "ready", text: "Ready." } }] } ] })),
    s.step("the seat sweep is let go", outbox.release({ hold: "all" })),
    s.step("the world settles", s.clock.settle()),
    s.step("the running executor: its row", outbox.rows(row)),
    s.step("a running executor is working", s.ada.run(stage, { id: s.last.rows[0].subject }), expect((a) => [a.stage, a.why, a.label]).toEqual(["working", "none", "Working"])),
    s.step("the model is let go: it reports ready", models.release({ hold: "all" })),
    s.step("the world settles after the report", s.clock.settle()),
    s.step("the reported ticket: its row", outbox.rows(row)),
    s.step("a ready report waits for review", s.ada.run(stage, { id: s.last.rows[0].subject }), expect((a) => [a.stage, a.why, a.label]).toEqual(["person", "review", "Awaiting review"])),
    s.step("the ticket is listed as waiting for a person", s.ada.run(waiting, { superagent: s.world.superagent }), expect((a) => a.items.map((i: { stage: string; why: string }) => [i.stage, i.why])).toEqual([["person", "review"]])),
    s.step("the ticket to stop: its row", outbox.rows(row)),
    s.step("ada stops it", s.ada.run(stop, { superagent: s.world.superagent, ticket: s.last.rows[0].subject })),
    s.step("the world settles after the stop", s.clock.settle()),
    s.step("the stopped ticket: its row", outbox.rows(row)),
    s.step("a stopped ticket is ended", s.ada.run(stage, { id: s.last.rows[0].subject }), expect((a) => [a.stage, a.why, a.label]).toEqual(["ended", "none", "Ended"])),
    s.step("an ended ticket is no longer listed as waiting", s.ada.run(waiting, { superagent: s.world.superagent }), expect((a) => a.items).toEqual([])),
  ],
});
