// Tests for guide-state.mjs. Run: bun test (from plugins/orthograph-guide).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-ignore: plain JavaScript module, no types
import { STAGES, TYPES, append, brief, fold, init, page, readLog, rebuild } from "./guide-state.mjs";

const SCRIPT = join(import.meta.dir, "guide-state.mjs");
let app: string;
const guide = (f: string) => join(app, ".orthograph/guide", f);
const lines = () => readFileSync(guide("log.jsonl"), "utf8").trim().split("\n");
const cli = (...args: string[]) => {
  const r = Bun.spawnSync(["node", SCRIPT, ...args, "--dir", app]);
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
};

beforeEach(() => { app = mkdtempSync(join(tmpdir(), "guide-")); });
afterEach(() => rmSync(app, { recursive: true, force: true }));

describe("the stages", () => {
  test("eleven stages, in the manual's order", () => {
    expect(STAGES.map((s: any) => s.stage)).toEqual(["plan", "spike", "describe", "done", "build", "review", "trace", "stage", "watch", "change", "agents"]);
  });
  test("the four built stages each have done checks; a check is either a command or a person's yes, or neither", () => {
    for (const name of ["plan", "spike", "describe", "done"]) {
      const s = STAGES.find((x: any) => x.stage === name);
      expect(s.done_when.length).toBeGreaterThan(0);
      for (const c of s.done_when) expect(c.check).toBeString();
    }
  });
});

describe("init", () => {
  test("writes the goal and enters plan, and makes state.json and GUIDE.md", () => {
    const s = init(app, "sell event tickets");
    expect(s.goal).toBe("sell event tickets");
    expect(s.stage).toBe("plan");
    expect(s.visit).toBe(1);
    expect(lines()).toHaveLength(2);
    expect(JSON.parse(readFileSync(guide("state.json"), "utf8")).stage).toBe("plan");
    expect(readFileSync(guide("GUIDE.md"), "utf8")).toContain("**Goal:** sell event tickets");
  });
  test("refuses a second init, and a missing goal", () => {
    init(app, "a");
    expect(() => init(app, "b")).toThrow("already has a guide log");
    const other = mkdtempSync(join(tmpdir(), "guide-"));
    expect(() => init(other, "")).toThrow("needs the goal");
    rmSync(other, { recursive: true, force: true });
  });
});

describe("append", () => {
  test("numbers events, stamps the time it is given, and keeps the log append-only", () => {
    init(app, "g");
    const before = lines();
    append(app, { type: "note", stage: "plan", text: "hello" }, "2026-11-26T10:00:00.000Z");
    const after = lines();
    expect(after.slice(0, 2)).toEqual(before);
    expect(JSON.parse(after[2])).toEqual({ n: 3, at: "2026-11-26T10:00:00.000Z", type: "note", stage: "plan", text: "hello" });
  });
  test("refuses an unknown type and writes nothing", () => {
    init(app, "g");
    expect(() => append(app, { type: "bogus" })).toThrow("unknown event type bogus");
    expect(lines()).toHaveLength(2);
  });
  test("refuses an event for a stage that does not exist, before writing it", () => {
    init(app, "g");
    expect(() => append(app, { type: "stage.entered", stage: "deploy" })).toThrow("no stage deploy");
    expect(lines()).toHaveLength(2);
  });
  test("every type the contract lists is accepted", () => {
    expect(TYPES).toEqual(["goal.set", "stage.entered", "stage.done", "stage.reopened", "decision", "open", "closed", "thread.started", "thread.returned", "check.ran", "blocker", "replan", "note"]);
  });
});

describe("fold", () => {
  const ev = (list: any[]) => list.map((e, k) => ({ n: k + 1, at: "t", ...e }));

  test("an empty log is a project not started", () => {
    const s = fold([]);
    expect(s.goal).toBeNull();
    expect(s.stage).toBeNull();
    expect(s.roadmap.every((r: any) => r.status === "todo")).toBeTrue();
  });

  test("a loop keeps every visit: plan, spike, back to plan", () => {
    const s = fold(ev([
      { type: "goal.set", goal: "g" },
      { type: "stage.entered", stage: "plan" },
      { type: "stage.done", stage: "plan" },
      { type: "stage.entered", stage: "spike", because: "two doubts" },
      { type: "stage.reopened", stage: "plan", from: "spike", because: "a late reversal breaks a rule" },
    ]));
    const plan = s.roadmap.find((r: any) => r.stage === "plan");
    expect(s.stage).toBe("plan");
    expect(s.visit).toBe(2);
    expect(plan.status).toBe("doing");
    expect(plan.visits.map((v: any) => v.because)).toEqual(["first", "reopened from spike: a late reversal breaks a rule"]);
    expect(plan.visits[0].ended).toEqual({ outcome: "done", at: 3 });
    expect(plan.visits[1].ended).toBeNull();
    expect(s.roadmap.find((r: any) => r.stage === "spike").status).toBe("doing");
  });

  test("checks belong to the visit they ran in", () => {
    const s = fold(ev([
      { type: "stage.entered", stage: "describe" },
      { type: "check.ran", stage: "describe", check: "blanks", cmd: "ortho check", pass: false },
      { type: "stage.reopened", stage: "describe", from: "done", because: "a story needs a state" },
      { type: "check.ran", stage: "describe", check: "blanks", cmd: "ortho check", pass: true },
    ]));
    const [v1, v2] = s.roadmap.find((r: any) => r.stage === "describe").visits;
    expect(v1.checks.map((c: any) => c.pass)).toEqual([false]);
    expect(v2.checks.map((c: any) => c.pass)).toEqual([true]);
  });

  test("a decision closes the open question it answers; closed drops one", () => {
    const s = fold(ev([
      { type: "stage.entered", stage: "plan" },
      { type: "open", stage: "plan", q: "is a refund final?" },
      { type: "open", stage: "plan", q: "who may cancel?" },
      { type: "open", stage: "plan", q: "old question" },
      { type: "decision", stage: "plan", q: "is a refund final?", a: "yes, after a day" },
      { type: "closed", q: "old question" },
    ]));
    expect(s.open.map((o: any) => o.q)).toEqual(["who may cancel?"]);
    expect(s.decided).toEqual([{ q: "is a refund final?", a: "yes, after a day", by: "owner", at: 5 }]);
  });

  test("threads: started is running, returned takes the outcome and brings its open questions", () => {
    const s = fold(ev([
      { type: "stage.entered", stage: "spike" },
      { type: "thread.started", stage: "spike", thread: "t1", role: "spike", task: "can two tabs reserve one seat?" },
      { type: "thread.started", stage: "spike", thread: "t2", role: "spike", task: "is the webhook ordered?" },
      { type: "thread.returned", stage: "spike", thread: "t1", outcome: "done", open: ["hold seats for how long?"] },
    ]));
    expect(s.threads.map((t: any) => [t.id, t.status])).toEqual([["t1", "done"], ["t2", "running"]]);
    expect(s.open).toEqual([{ q: "hold seats for how long?", waits_on: "owner", blocks: "spike", at: 4 }]);
    expect(s.roadmap.find((r: any) => r.stage === "spike").visits[0].threads).toEqual(["t1", "t2"]);
  });

  test("a blocker blocks its stage; a replan that clears it unblocks it", () => {
    const base = [
      { type: "stage.entered", stage: "describe" },
      { type: "blocker", stage: "describe", what: "ortho generate fails" },
    ];
    const blocked = fold(ev(base));
    expect(blocked.roadmap.find((r: any) => r.stage === "describe").status).toBe("blocked");
    const cleared = fold(ev([...base, { type: "replan", stage: "describe", plan: ["fill the states first", "generate again"], clears: ["ortho generate fails"] }]));
    expect(cleared.roadmap.find((r: any) => r.stage === "describe").status).toBe("doing");
    expect(cleared.blockers[0].cleared).toBeTrue();
    expect(cleared.plan).toEqual(["fill the states first", "generate again"]);
  });

  test("next is the latest one given", () => {
    const s = fold(ev([
      { type: "note", text: "a", next: { do: "one" } },
      { type: "note", text: "b" },
      { type: "note", text: "c", next: { do: "two", why: "because" } },
    ]));
    expect(s.next).toEqual({ do: "two", why: "because" });
    expect(s.last).toBe(3);
  });
});

describe("page", () => {
  test("shows the goal, now, next, what waits on the owner, the roadmap with visits, and what is decided", () => {
    init(app, "sell tickets");
    append(app, { type: "stage.done", stage: "plan" });
    append(app, { type: "stage.entered", stage: "spike" });
    append(app, { type: "stage.reopened", stage: "plan", from: "spike", because: "refunds break a rule" });
    append(app, { type: "open", stage: "plan", q: "is a refund final?" });
    append(app, { type: "open", stage: "plan", q: "for the thread", waits_on: "t1" });
    const s = append(app, { type: "decision", stage: "plan", q: "who sells?", a: "organisers", next: { do: "ask about refunds", why: "it blocks the plan" } });
    const md = page(s);
    expect(md).toContain("**Now:** Plan it, visit 2");
    expect(md).toContain("**Next:** ask about refunds (it blocks the plan)");
    expect(md).toContain("- is a refund final?");
    expect(md).not.toContain("for the thread");
    expect(md).toContain("[~] **Plan it** (visited 2 times)");
    expect(md).toContain("    - visit 2: reopened from spike: refunds break a rule");
    expect(md).toContain("[~] **Spike what you doubt**");
    expect(md).toContain("[ ] **Describe it**");
    expect(md).toContain("- who sells? **organisers** (owner)");
    expect(readFileSync(guide("GUIDE.md"), "utf8")).toBe(md);
  });
});

describe("rebuild", () => {
  test("state.json and GUIDE.md come back from the log alone", () => {
    init(app, "g");
    append(app, { type: "open", stage: "plan", q: "q?" }, "2026-11-26T10:00:00.000Z");
    const state = readFileSync(guide("state.json"), "utf8"), md = readFileSync(guide("GUIDE.md"), "utf8");
    rmSync(guide("state.json")); rmSync(guide("GUIDE.md"));
    rebuild(app);
    expect(readFileSync(guide("state.json"), "utf8")).toBe(state);
    expect(readFileSync(guide("GUIDE.md"), "utf8")).toBe(md);
  });
  test("a line that is not JSON is named", () => {
    init(app, "g");
    appendFileSync(guide("log.jsonl"), "not json\n");
    expect(() => readLog(app)).toThrow("log.jsonl line 3 is not JSON");
  });
});

describe("brief", () => {
  test("with no project, says to start with the guide skill", () => {
    expect(brief(app)).toBe("orthograph guide: no project yet. Start with the guide skill.");
  });
  test("names the goal, the stage, what is done, next, what waits and running threads", () => {
    init(app, "g");
    append(app, { type: "stage.done", stage: "plan" });
    append(app, { type: "stage.entered", stage: "spike" });
    append(app, { type: "thread.started", stage: "spike", thread: "t1", role: "spike", task: "x" });
    append(app, { type: "open", stage: "spike", q: "q?", next: { do: "wait for t1" } });
    expect(brief(app).split("\n")).toEqual([
      'orthograph guide: goal "g"',
      "now: Spike what you doubt, visit 1, doing",
      "done: plan",
      "next: wait for t1",
      "waiting: q?",
      "running threads: t1 spike",
    ]);
  });
});

describe("the command line", () => {
  test("init, log, brief, show and rebuild, with --dir", () => {
    expect(cli("init", "sell tickets")).toMatchObject({ code: 0, out: "guide started: sell tickets\n" });
    expect(cli("log", JSON.stringify({ type: "note", stage: "plan", text: "x" }))).toMatchObject({ code: 0, out: "logged #3; now plan, visit 1\n" });
    expect(cli("brief").out).toContain('goal "sell tickets"');
    expect(JSON.parse(cli("show").out).last).toBe(3);
    expect(cli("rebuild")).toMatchObject({ code: 0, out: "rebuilt from 3 events\n" });
  });
  test("a refused event exits 1 with the reason and writes nothing", () => {
    cli("init", "g");
    const r = cli("log", JSON.stringify({ type: "bogus" }));
    expect(r.code).toBe(1);
    expect(r.err).toContain("guide-state: unknown event type bogus");
    expect(lines()).toHaveLength(2);
  });
  test("bad JSON exits 1; an unknown command prints usage and exits 2", () => {
    cli("init", "g");
    expect(cli("log", "{nope").code).toBe(1);
    const r = cli("frobnicate");
    expect(r.code).toBe(2);
    expect(r.err).toContain("usage:");
  });
  test("importing the module runs no command and writes nothing", () => {
    const r = Bun.spawnSync(["bun", "-e", `await import(${JSON.stringify(SCRIPT)})`], { cwd: app });
    expect(r.exitCode).toBe(0);
    expect(existsSync(join(app, ".orthograph"))).toBeFalse();
  });
});
