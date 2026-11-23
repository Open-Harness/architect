// Check 14 (Goal 17 slice 5): the framework declarations the blueprint needs are accepted, and each is in the model with the
// shape its record documents: K40 fixes 1 to 3 (`actor:`, `versions:`, `Agent`, `agent:`), `Source.from` and `Source.timer`
// (GOAL17-source-from), `Blueprint.hold` (GOAL17-pause) and `Blueprint.problem` (GOAL17-derived-reads). The refusals of
// misuse are check 15; the derived reads, check 16. Where the design leaves the model's key open, the README fixes it.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { allowedSet, build, entries, lazy, removeCopies, superagent } from "./app.ts";

describe("14 the framework forms: each is accepted, and in the model as its record says", () => {
  const built = lazy(build);
  afterAll(removeCopies);
  const ops = () => built().model["operations"];
  const things = () => built().model["things"];
  const keys = (o: unknown) => Object.keys((o ?? {}) as object);

  describe("versions: (K40 fix 2)", () => {
    it("Policy is keyed by superagent; each save is kept: `policy.save`, `get`, `history` and `restore` are generated with K40's payloads", () => {
      expect(things()["policy"]?.versions).toEqual({ key: "superagent" });
      expect(keys(ops()["policy.save"]?.payload)).toEqual(expect.arrayContaining(["superagent", "base"]));
      expect(keys(ops()["policy.save"]?.answer)).toContain("revision");
      expect(keys(ops()["policy.get"]?.payload)).toEqual(expect.arrayContaining(["superagent", "revision"]));
      expect(ops()["policy.get"]?.payload?.["revision"]?.optional, "`revision?`: the current one when left out").toBe(true);
      expect(keys(ops()["policy.history"]?.payload)).toContain("superagent");
      expect(JSON.stringify(ops()["policy.history"]?.answer)).toMatch(/revision/);
      for (const f of ["at", "by", "from"]) expect(JSON.stringify(ops()["policy.history"]?.answer), `history carries ${f}`).toContain(`"${f}"`);
      expect(keys(ops()["policy.restore"]?.payload)).toEqual(expect.arrayContaining(["superagent", "revision", "base"]));
      expect(keys(ops()["policy.restore"]?.answer)).toContain("revision");
    });

    it("a stale save or restore is refused StaleRevision, which carries the current revision", () => {
      for (const o of ["policy.save", "policy.restore"]) expect(ops()[o]?.refusals ?? [], o).toContain("StaleRevision");
      const error = Object.values<any>(things()).map((t) => t.errors?.["StaleRevision"]).find((e) => e !== undefined);
      expect(keys(error?.fields), "StaleRevision { current }").toContain("current");
    });

    it("a Mandate pins the Policy revision it was accepted under", () => {
      expect(things()["mandate"]?.fields?.["policy"], "mandate.policy").toBeDefined();
    });

    it("every thing with versions names a key that is one of its fields: Superagent, Policy, PromptSet and Settings", () => {
      for (const t of ["superagent", "policy", "prompt-set", "settings"]) {
        const v = things()[t]?.versions;
        expect(typeof v?.key, `${t}.versions.key`).toBe("string");
        expect(things()[t]?.fields?.[v.key], `${t}: versions key ${String(v?.key)} is a field`).toBeDefined();
      }
    });
  });

  describe("actor: (K40 fix 1, GOAL17-source-from)", () => {
    it("the Account's listed role is an `actor:` role, and the accept refuses a caller that is not that account", () => {
      expect(things()["account"]?.roles).toContain("listed");
      expect(allowedSet(ops()["ticket.accept"]?.allowed), "allowed: [listed.of(\"account\")], and nothing wider").toEqual(entries({ kind: "role-of", role: "account.listed", path: "account" }));
      expect(ops()["ticket.accept"]?.refusals ?? []).toContain("NotAllowed");
    });
  });

  describe("Agent and agent: (K40 fix 3)", () => {
    it("an Agent is a thing that lives in its own actor: id `agt`, kind, about; idle, working, stopped", () => {
      const agent = things()["agent"];
      expect(agent?.lives).toBe("actor");
      expect(agent?.fields?.["id"]?.value).toMatchObject({ type: "id", prefix: "agt" });
      expect(keys(agent?.fields)).toEqual(expect.arrayContaining(["kind", "about"]));
      expect([...(agent?.machine?.states ?? [])].sort()).toEqual(["idle", "stopped", "working"]);
    });

    it("`agent.tell` is the system's alone, and takes what the hops send: the agent, the request id, the input, and the Assignment it is for", () => {
      expect(ops()["agent.tell"]?.allowed).toEqual([{ kind: "system" }]);
      expect(keys(ops()["agent.tell"]?.payload)).toEqual(expect.arrayContaining(["agent", "requestId", "input", "assignment", "opens"]));
      expect(ops()["agent.tell"]?.refusals ?? [], "a tell for a closed Assignment is refused StaleAssignment").toContain("StaleAssignment");
      expect(keys(ops()["agent.close"]?.payload)).toEqual(expect.arrayContaining(["agent", "assignment"]));
    });

    it("a thing names its agent with an agent-id field: the Superagent's `main`, the Ticket's `agent`; `itsMain` and `itsAgent` are the roles over them", () => {
      expect(things()["superagent"]?.fields?.["main"]?.ref).toBe("agent.id");
      expect(things()["ticket"]?.fields?.["agent"]?.ref).toBe("agent.id");
      expect(things()["superagent"]?.roles).toContain("itsMain");
      expect(things()["ticket"]?.roles).toContain("itsAgent");
    });
  });

  describe("Source.from and Source.timer (GOAL17-source-from)", () => {
    it("each active source folds into the model: its mount, the events and calls it uses, its variables and the kinds it makes", () => {
      const s = built().model["sources"] ?? {};
      expect(s["github"]).toMatchObject({ mount: "github" });
      expect(s["github"]?.events).toEqual(expect.arrayContaining(["issueComment", "pullRequestReview", "pullRequest"]));
      expect(s["github"]?.calls).toEqual(expect.arrayContaining(["issues.createComment", "issues.listComments"]));
      expect(keys(s["github"]?.variables)).toEqual(expect.arrayContaining(["GITHUB_REPOSITORY", "GITHUB_NUMBER"]));
      expect(s["github"]?.kinds).toEqual(expect.arrayContaining(["comment", "review"]));
      expect(s["slack"]).toMatchObject({ mount: "slack" });
      expect(s["slack"]?.events).toEqual(expect.arrayContaining(["appMention", "message"]));
      expect(keys(s["slack"]?.variables)).toEqual(expect.arrayContaining(["SLACK_CHANNEL", "SLACK_THREAD"]));
      expect(s["slack"]?.kinds).toEqual(expect.arrayContaining(["mention", "message", "direct"]));
      expect(s["posthog"]).toMatchObject({ mount: "posthog" });
      expect(keys(s["posthog"]?.variables)).toEqual(expect.arrayContaining(["POSTHOG_PROJECT", "POSTHOG_ISSUE"]));
      expect(s["posthog"]?.kinds).toEqual(expect.arrayContaining(["errorIssue"]));
    });

    it("every variable a source declares is named from its own service, in capitals, and never as a secret (GOAL17-source-from, 'How `environment` reaches the executor')", () => {
      const own: Record<string, string> = { github: "GITHUB_", slack: "SLACK_", posthog: "POSTHOG_" };
      for (const [name, s] of Object.entries<any>(built().model["sources"] ?? {})) {
        for (const v of keys(s.variables)) {
          expect(v, `${name}: ${v}`).toMatch(/^[A-Z][A-Z0-9_]*$/);
          expect(v, `${name}: ${v}`).not.toMatch(/_(TOKEN|KEY|SECRET|PASSWORD)$/);
          if (own[name] !== undefined) expect(v.startsWith(own[name]!), `${name}: ${v} starts with ${own[name]}`).toBe(true);
        }
      }
    });

    it("the intake plugin has one file per source kind the brief names, the timer among them", () => {
      const missing = ["github", "slack", "posthog", "timer"].filter((s) => !existsSync(join(superagent, "plugins/intake/blueprint/sources", `${s}.ts`)));
      expect(missing, "plugins/intake/blueprint/sources/<name>.ts").toEqual([]);
    });
  });

  describe("Blueprint.hold (GOAL17-pause)", () => {
    const pair = (d: any) => `${d.event}>${d.to}`;
    // the deliveries GOAL17-pause lists
    const HELD = ["EvalStarted>eval.delivered", "EvalDelivered>agent.tell", "InputRouted>agent.tell", "AssignmentQueued>superagent.fill", "AssignmentEnded>superagent.fill", "AssignmentEnded>input.route",
      "AssignmentPromoted>superagent.fill", "AssignmentStarted>agent.tell", "AssignmentStarted>input.route", "ReplyQueued>outgoing-message.send"];
    const UNHELD = ["InputStored>input.route", "AgentIdled>assignment.turn-ended", "AgentClosed>assignment.turn-ended", "AssignmentInterrupted>agent.close", "TriggerReceived>input.store", "SuperagentResumed>superagent.fill", "SuperagentCreated>eval.due", "SuperagentResumed>eval.due"];
    const processing = () => built().model["holds"]?.["processing"];

    it("one switch, named `processing`: the Superagent's own id, held while it is paused", () => {
      expect(processing()).toMatchObject({ thing: "superagent", key: "id", while: ["paused"] });
    });

    it("it lists every held delivery the record names, and every unheld one, each unheld with its reason", () => {
      expect(((processing()?.held ?? []) as ReadonlyArray<any>).map(pair)).toEqual(expect.arrayContaining(HELD));
      const unheld = (processing()?.unheld ?? []) as ReadonlyArray<any>;
      expect(unheld.map(pair)).toEqual(expect.arrayContaining(UNHELD));
      expect(unheld.filter((u) => typeof u.reason !== "string" || u.reason.length === 0).map(pair), "unheld deliveries with no reason").toEqual([]);
    });

    it("no event has deliveries on both lists, and slice 5's own share is there: each event the record leaves to it is in one of them", () => {
      const held = ((processing()?.held ?? []) as ReadonlyArray<any>).map(pair);
      const unheld = ((processing()?.unheld ?? []) as ReadonlyArray<any>).map(pair);
      const heldEvents = new Set(held.map((p) => p.split(">")[0]));
      expect([...new Set(unheld.map((p) => p.split(">")[0]))].filter((e) => heldEvents.has(e)), "events on both lists").toEqual([]);
      const events = new Set([...held, ...unheld].map((p) => p.split(">")[0]));
      const missing = ["TicketCreated", "TicketResumed", "TicketEnded", "TriggerRequeued", "DecisionRecorded", "ThreadSubscribed", "ThreadUnsubscribed", "PolicyChanged"].filter((e) => !events.has(e));
      expect(missing, "events GOAL17-pause leaves to slice 5, in neither list").toEqual([]);
    });
  });

  describe("Blueprint.problem (GOAL17-derived-reads)", () => {
    it("a Source and an OutgoingMessage each say what can fail, beside the thing: a source's after is its failAfter, a channel's is 3", () => {
      const problems = (built().model["problems"] ?? []) as ReadonlyArray<any>;
      expect(problems.find((p) => p.kind === "source")).toMatchObject({ thing: "source", of: "superagent", name: "name", failures: "failures", after: "failAfter" });
      expect(problems.find((p) => p.kind === "channel")).toMatchObject({ thing: "outgoing-message", of: "superagent", name: "id", failures: "failures", after: 3 });
    });
  });
});
