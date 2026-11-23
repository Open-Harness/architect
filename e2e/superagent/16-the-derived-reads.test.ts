// Check 16 (Goal 17 slice 5): the four derived reads exist as GOAL17-derived-reads declares them: `ticket.stage`,
// `ticket.waiting`, `superagent.health`, and the stored `proposal.waiting` that `only:` settles; and `superagent.boot`,
// which "joins the Superagent's operations" (17-superagent.md, "Where it stands"). Judged from the model; docs, CLI and
// MCP list them through checks 09 to 11. The refusals of a wrong `derive:` are check 15.
import { afterAll, describe, expect, it } from "vitest";
import { allowedSet, build, entries, lazy, removeCopies } from "./app.ts";

describe("16 the derived reads and superagent.boot exist as declared", () => {
  const built = lazy(build);
  afterAll(removeCopies);
  const op = (name: string) => built().model["operations"][name];
  const keys = (o: unknown) => Object.keys((o ?? {}) as object).sort();
  const itsMainOf = (path: string) => ({ kind: "role-of", role: "superagent.itsMain", path });
  const allowedIs = (name: string, ...want: ReadonlyArray<object>) => expect(allowedSet(op(name)?.allowed), `${name}: allowed, exactly as the record lists it`).toEqual(entries(...want));

  describe("ticket.stage: one ticket's row of the stage table", () => {
    it("is a read by id, whose answer is the ticket's own fields and the stage, why and label the table adds", () => {
      expect(op("ticket.stage")?.kind).toBe("read");
      expect(op("ticket.stage")?.list, "by id, never a list").toBeUndefined();
      expect(keys(op("ticket.stage")?.payload)).toEqual(["id"]);
      expect(keys(op("ticket.stage")?.answer)).toEqual(expect.arrayContaining(["superagent", "title", "state", "stage", "why", "label"]));
    });

    it("looks at the ticket's newest report, assignment and open attention, its newest failed input and its newest input from a person, each by the ticket", () => {
      const looks = op("ticket.stage")?.derive?.looks;
      expect(keys(looks)).toEqual(["assignment", "attention", "person", "report", "undelivered"]);
      expect(looks?.report).toMatchObject({ thing: "report", by: "ticket", take: "newest" });
      expect(looks?.assignment).toMatchObject({ thing: "assignment", by: "ticket", take: "newest" });
      expect(looks?.attention).toMatchObject({ thing: "attention", by: "ticket", state: "open", take: "newest" });
      expect(looks?.undelivered).toMatchObject({ thing: "input", by: "ticket", state: "failed", take: "newest" });
      expect(looks?.person).toMatchObject({ thing: "input", by: "ticket", where: { from: "person" }, take: "newest" });
      expect(op("ticket.stage")?.derive?.hash, "the function's hash, so the docs say when the table changes").toEqual(expect.any(String));
    });

    it("is for a signed-in person, the superagent's main agent and the ticket's own agent; and it is an agent's tool", () => {
      allowedIs("ticket.stage", { kind: "signed-in" }, itsMainOf("superagent"), { kind: "role", role: "ticket.itsAgent" });
      expect(op("ticket.stage")?.agentTool).toBe(true);
    });
  });

  describe("ticket.waiting: every ticket whose stage is a person's", () => {
    it("is a list read of the superagent's tickets, newest first, 50 to a page, pinned to stage `person`, with a 150 ms budget", () => {
      const w = op("ticket.waiting");
      expect(w?.kind).toBe("read");
      expect(w?.list).toMatchObject({ where: ["superagent"], order: "newest", page: 50 });
      expect(w?.only).toEqual({ stage: "person" });
      expect(w?.budget).toEqual({ p95Ms: 150 });
      expect(keys(w?.answer), "a list read answers a page, derived or not (GOAL17-list-answer)").toEqual(["items", "next"]);
      expect(keys(w?.derive?.adds)).toEqual(expect.arrayContaining(["stage", "why", "label"]));
      expect(w?.derive?.adds, "the same adds as ticket.stage").toEqual(op("ticket.stage")?.derive?.adds);
    });

    it("uses the same stage table as ticket.stage, written once, and is for a signed-in person and the main agent", () => {
      expect(op("ticket.waiting")?.derive?.hash).toBe(op("ticket.stage")?.derive?.hash);
      expect(op("ticket.waiting")?.derive?.looks).toEqual(op("ticket.stage")?.derive?.looks);
      allowedIs("ticket.waiting", { kind: "signed-in" }, itsMainOf("superagent"));
    });
  });

  describe("proposal.waiting: a stored list with a pinned state, no derive", () => {
    it("lists the superagent's proposals, oldest first, 25 to a page, only those waiting", () => {
      const w = op("proposal.waiting");
      expect(w?.kind).toBe("read");
      expect(w?.list).toMatchObject({ where: ["superagent"], order: "oldest", page: 25 });
      expect(w?.only).toEqual({ state: "waiting" });
      expect(w?.derive, "stored, nothing worked out").toBeUndefined();
      allowedIs("proposal.waiting", { kind: "signed-in" }, itsMainOf("superagent"));
    });
  });

  describe("superagent.health: each source's and channel's problems, and whether it is paused", () => {
    it("is a read by id, answering its name, state and pausedAt, and the problems it works out, with whether more were cut", () => {
      const h = op("superagent.health");
      expect(h?.kind).toBe("read");
      expect(h?.list).toBeUndefined();
      expect(keys(h?.answer)).toEqual(expect.arrayContaining(["name", "state", "pausedAt", "problems", "more"]));
      expect(h?.budget).toEqual({ p95Ms: 200 });
    });

    it("looks at every problem the app declares that points at this superagent; no count of held work, no outbox row (GOAL17-pause)", () => {
      const h = op("superagent.health");
      expect(keys(h?.derive?.looks)).toEqual(["watched"]);
      expect(h?.derive?.looks?.watched?.kind).toBe("problems");
      expect(Object.keys(h?.answer ?? {}).filter((k) => /held|outbox/i.test(k)), "answer fields about held work or the outbox").toEqual([]);
    });

    it("is for a signed-in person and the superagent's main agent", () => {
      allowedIs("superagent.health", { kind: "signed-in" }, { kind: "role", role: "superagent.itsMain" });
    });
  });

  describe("superagent.boot: the world's once-a-minute backstop (GOAL17-pause, 'After a restart')", () => {
    it("is an operation, not a read, for the system alone", () => {
      expect(op("superagent.boot")).toBeDefined();
      expect(op("superagent.boot")?.kind).not.toBe("read");
      expect(op("superagent.boot")?.allowed).toEqual([{ kind: "system" }]);
    });
  });
});
