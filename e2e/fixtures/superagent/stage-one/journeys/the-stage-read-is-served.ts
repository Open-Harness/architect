// Checks-author file (Goal 17, slice 6). A builder never edits it.
// GOAL17-slice5-forms call 13: until slice 7 serves `looks`, `is` and `only`, `ticket.stage` and `ticket.waiting` refuse with
// `ReadNotServed`. These are the rows of the stage read a journey can reach with no ticket: an empty page, a ticket that is not
// there, and who may read. The table's rows themselves are `20-the-stage-table`; their journeys wait on the harness.
import { Blueprint, expect, refuses } from "orthograph";
import { Ticket } from "@orthograph/tickets/blueprint/things/ticket/thing.ts";
import stage from "@orthograph/tickets/blueprint/things/ticket/verbs/stage.ts";
import waiting from "@orthograph/tickets/blueprint/things/ticket/verbs/waiting.ts";

export default Blueprint.journey("the stage read is served", {
  cast: { ada: Blueprint.signedIn, visitor: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "ada reads the tickets waiting for a person on a superagent that has none: an empty page, and no next",
      s.ada.run(waiting, { superagent: "sag_nothingwaits1" }),
      expect((a) => a.items).toEqual([]),
      expect((a) => a.next).toBe(null),
    ),
    s.step(
      "ada reads the stage of a ticket there is none of: it is not found",
      s.ada.run(stage, { id: "tkt_nothere1" }),
      refuses(Ticket.notFound, { id: "tkt_nothere1" }),
    ),
    s.step(
      "someone who is not signed in is refused the waiting list",
      s.visitor.run(waiting, { superagent: "sag_nothingwaits1" }),
      refuses(Blueprint.NotAllowed),
    ),
    s.step(
      "someone who is not signed in is refused a ticket's stage",
      s.visitor.run(stage, { id: "tkt_nothere1" }),
      refuses(Blueprint.NotAllowed),
    ),
  ],
});
