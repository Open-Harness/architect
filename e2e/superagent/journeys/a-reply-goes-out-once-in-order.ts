// Journey-author file (Goal 17 slice 10): "a reply goes out once, in order". The main agent queues two replies on one ticket's
// conversation; each goes out once, in the order queued, on GitHub; a kill and a restart afterwards, and an hour of clock, send
// nothing again. The ticket starts paused (`a-live-superagent-with-a-ticket`), so its first model turn is scripted before it runs. The stand-in's `replies` reads what it took, in order (GOAL17-check-harness, call 2).
import { Blueprint, expect, outbox } from "orthograph";
import { github } from "@orthograph/github/stand";
import { models } from "@orthograph/stand-in-model/stand";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";
import superagentResume from "@orthograph/superagent/blueprint/things/superagent/verbs/resume.ts";
import reply from "@orthograph/tickets/blueprint/things/outgoing-message/verbs/reply.ts";

const ours = (a: { replies: ReadonlyArray<{ body: string }> }) => a.replies.map((r) => r.body).filter((t) => t.startsWith("First.") || t.startsWith("Second."));

export default Blueprint.journey("a reply goes out once, in order", {
  cast: { ann: Blueprint.signedIn, main: itsMain },
  starts: "a-live-superagent-with-a-ticket",
  steps: (s) => [
    s.step("the executor's first turn is scripted: it says it has started and ends", models.script({ for: { kind: "executor" }, turns: [{ say: "Starting." }] })),
    s.step("ann resumes the superagent: the ticket's first turn runs", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the world settles", s.clock.settle()),
    s.step("the main agent queues the first reply", s.main.run(reply, { superagent: s.world.superagent, ticket: s.world.ticket, conversation: "ticket", purpose: "update", text: "First." })),
    s.step("and the second", s.main.run(reply, { superagent: s.world.superagent, ticket: s.world.ticket, conversation: "ticket", purpose: "update", text: "Second." })),
    s.step("the world settles", s.clock.settle()),
    s.step("GitHub took each once, first then second", github.replies({ issue: 12 }), expect((a) => ours(a).map((t: string) => t.slice(0, 6))).toEqual(["First.", "Second"])),
    s.step("none is left pending", outbox.rows({ name: "ReplyQueued", state: "pending" }), expect((a) => a.rows.length).toBe(0)),
    s.step("the runner is killed and started again", s.runner.restart()),
    s.step("an hour passes", s.clock.advance("1 hour")),
    s.step("still once each: nothing was sent again", github.replies({ issue: 12 }), expect((a) => ours(a).length).toBe(2)),
    s.step("the scripted turn was used, none left over", models.done({}), expect((a) => a.unused).toBe(0)),
  ],
});
