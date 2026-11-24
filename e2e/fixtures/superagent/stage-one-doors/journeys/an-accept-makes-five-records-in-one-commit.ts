// Checks-author file (Goal 17, slice 6). A builder never edits it. Written against GOAL17-check-harness's doors (the `actor:` cast form: a listed
// outside account as the caller); see `22-stage-one-doors`.
// GOAL17-stage-one call 3: `ticket.accept` makes the Ticket, its Mandate, its Subscription, its first Assignment and its first Input in one commit, for an
// executor opened first. One call's journal holds one event for each record, and a second accept of the same executor is refused whole.
import { Blueprint, emits, noEvents, refuses } from "orthograph";
import { listed } from "@orthograph/intake/blueprint/things/account/roles.ts";
import { TicketCreated } from "@orthograph/tickets/blueprint/things/ticket/events.ts";
import { MandateHeld } from "@orthograph/tickets/blueprint/things/mandate/events.ts";
import { SubscriptionStarted } from "@orthograph/tickets/blueprint/things/subscription/events.ts";
import { AssignmentQueued } from "@orthograph/tickets/blueprint/things/assignment/events.ts";
import { InputStored } from "@orthograph/tickets/blueprint/things/input/events.ts";
import { ExecutorAlreadyQueued } from "@orthograph/tickets/blueprint/things/assignment/errors.ts";
import accept from "@orthograph/tickets/blueprint/things/ticket/verbs/accept.ts";

export default Blueprint.journey("an accept makes five records in one commit", {
  cast: { ann: listed },       // ann is the listed account U1 of the world: naming her is what the `actor:` cast form must do
  starts: "an-executor-was-opened",
  steps: (s) => [
    s.step("ann's accept makes the ticket, its mandate, its subscription, its first assignment and its first input", s.ann.run(accept, {
      superagent: s.world.superagent, account: s.world.account, title: "fix the flaky login test", agent: s.world.executor, thread: "C1:50.1", text: "@agent fix the flaky login test" }),
      emits(TicketCreated, { superagent: s.world.superagent }), emits(MandateHeld, {}), emits(SubscriptionStarted, {}), emits(AssignmentQueued, { superagent: s.world.superagent }), emits(InputStored, { superagent: s.world.superagent })),
    s.step("a second accept for the same executor is refused, and nothing is written", s.ann.run(accept, {
      superagent: s.world.superagent, account: s.world.account, title: "again", agent: s.world.executor, thread: "C1:51.1", text: "@agent again" }),
      refuses(ExecutorAlreadyQueued, {}), noEvents()),
  ],
});
