// Tests for conductor-state.mjs. Run: bun test (from plugins/orthograph-conductor).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-ignore: plain JavaScript module, no types
import { STAGES, TYPES, append, brief, due, fold, init, page, readLog, rebuild } from "./conductor-state.mjs";

const SCRIPT = join(import.meta.dir, "conductor-state.mjs");
let app: string;
const conductor = (f: string) => join(app, ".orthograph/conductor", f);
const lines = () => readFileSync(conductor("log.jsonl"), "utf8").trim().split("\n");
const cli = (...args: string[]) => {
  const r = Bun.spawnSync(["node", SCRIPT, ...args, "--dir", app]);
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
};

beforeEach(() => { app = mkdtempSync(join(tmpdir(), "conductor-")); });
afterEach(() => rmSync(app, { recursive: true, force: true }));

describe("the stages", () => {
  test("eleven stages, in the manual's order", () => {
    expect(STAGES.map((s: any) => s.stage)).toEqual(["plan", "spike", "describe", "done", "build", "review", "trace", "stage", "watch", "change", "agents"]);
  });
  test("the seven stages with skills each have done checks, each a sentence with at most a command or a reader", () => {
    for (const name of ["plan", "spike", "describe", "done", "build", "review", "trace"]) {
      const s = STAGES.find((x: any) => x.stage === name);
      expect(s.done_when.length).toBeGreaterThan(0);
      for (const c of s.done_when) {
        expect(c.check).toBeString();
        expect(Object.keys(c).every((k) => ["check", "cmd", "reader"].includes(k))).toBeTrue();
        expect(c.cmd === undefined || c.reader === undefined).toBeTrue();
      }
    }
    for (const name of ["stage", "watch", "change", "agents"]) expect(STAGES.find((x: any) => x.stage === name).done_when).toEqual([]);
  });
});

describe("init", () => {
  test("writes the goal and enters plan, and makes state.json and ROADMAP.md", () => {
    const s = init(app, "sell event tickets");
    expect(s.goal).toBe("sell event tickets");
    expect(s.stage).toBe("plan");
    expect(s.visit).toBe(1);
    expect(lines()).toHaveLength(2);
    expect(JSON.parse(readFileSync(conductor("state.json"), "utf8")).stage).toBe("plan");
    expect(readFileSync(conductor("ROADMAP.md"), "utf8")).toContain("**Goal:** sell event tickets");
  });
  test("refuses a second init, and a missing goal", () => {
    init(app, "a");
    expect(() => init(app, "b")).toThrow("already has a conductor log");
    const other = mkdtempSync(join(tmpdir(), "conductor-"));
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
  test("the number and the time are always the script's: a caller's n and at are replaced", () => {
    init(app, "g");
    append(app, { type: "note", text: "x", n: 1, at: "yesterday" }, "2026-11-27T00:00:00.000Z");
    expect(JSON.parse(lines()[2])).toMatchObject({ n: 3, at: "2026-11-27T00:00:00.000Z" });
  });
  test("an event without its required fields is refused and nothing is written", () => {
    init(app, "g");
    for (const bad of [{ type: "open", q: "no stage" }, { type: "decision", stage: "plan", q: "q" }, { type: "worker.started", stage: "plan", worker: "w1" }, { type: "note" }]) {
      expect(() => append(app, bad)).toThrow("needs");
    }
    expect(lines()).toHaveLength(2);
  });
  test("a worker must be started before it returns, and started only once", () => {
    init(app, "g");
    expect(() => append(app, { type: "worker.returned", stage: "plan", worker: "w9", outcome: "done" })).toThrow("no worker w9 was started");
    append(app, { type: "worker.started", stage: "plan", worker: "w1", role: "spike", task: "x" });
    expect(() => append(app, { type: "worker.started", stage: "plan", worker: "w1", role: "spike", task: "y" })).toThrow("already started");
  });
  test("many writers at once each get their own number", async () => {
    init(app, "g");
    const procs = Array.from({ length: 8 }, (_, k) => Bun.spawn(["node", SCRIPT, "log", JSON.stringify({ type: "note", text: `w${k}` }), "--dir", app]));
    await Promise.all(procs.map((p) => p.exited));
    expect(procs.every((p) => p.exitCode === 0)).toBeTrue();
    expect(lines().map((l) => JSON.parse(l).n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(existsSync(conductor("lock"))).toBeFalse();
    expect(readLog(app)).toHaveLength(10);
  });
  test("a lock left by a writer that died is taken over", () => {
    init(app, "g");
    mkdirSync(conductor("lock"));
    const old = new Date(Date.now() - 120_000);
    require("node:fs").utimesSync(conductor("lock"), old, old);
    append(app, { type: "note", text: "after" });
    expect(lines()).toHaveLength(3);
  });
  test("fields are held to their kinds: pass is true or false, outcome is one of three, lists are lists", () => {
    init(app, "g");
    append(app, { type: "worker.started", stage: "plan", worker: "w1", role: "spike", task: "x" });
    expect(() => append(app, { type: "check.ran", stage: "plan", check: "c", pass: "maybe" })).toThrow("pass is true or false");
    expect(() => append(app, { type: "worker.returned", stage: "plan", worker: "w1", outcome: "finished" })).toThrow("outcome is done, blocked or partial");
    expect(() => append(app, { type: "replan", stage: "plan", plan: "one step" })).toThrow("plan is a list");
    expect(lines()).toHaveLength(3);
  });
  test("two inits at once start one project", async () => {
    const procs = Array.from({ length: 4 }, () => Bun.spawn(["node", SCRIPT, "init", "g", "--dir", app], { stderr: "pipe" }));
    await Promise.all(procs.map((p) => p.exited));
    expect(procs.filter((p) => p.exitCode === 0).length).toBeGreaterThanOrEqual(1);
    expect(readLog(app).filter((e: any) => e.type === "goal.set")).toHaveLength(1);
  });
  test("every type the contract lists is accepted", () => {
    expect(TYPES).toEqual(["goal.set", "stage.entered", "stage.done", "stage.reopened", "decision", "open", "closed", "worker.started", "worker.returned", "check.ran", "blocker", "replan", "note"]);
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

  test("workers: started is running, returned takes the outcome and brings its open questions", () => {
    const s = fold(ev([
      { type: "stage.entered", stage: "spike" },
      { type: "worker.started", stage: "spike", worker: "t1", role: "spike", task: "can two tabs reserve one seat?" },
      { type: "worker.started", stage: "spike", worker: "t2", role: "spike", task: "is the webhook ordered?" },
      { type: "worker.returned", stage: "spike", worker: "t1", outcome: "done", open: ["hold seats for how long?"] },
    ]));
    expect(s.workers.map((t: any) => [t.id, t.status])).toEqual([["t1", "done"], ["t2", "running"]]);
    expect(s.open).toEqual([{ q: "hold seats for how long?", waits_on: "owner", blocks: "spike", at: 4 }]);
    expect(s.roadmap.find((r: any) => r.stage === "spike").visits[0].workers).toEqual(["t1", "t2"]);
  });

  test("a replan that clears only one of two blockers leaves the stage blocked", () => {
    const s = fold(ev([
      { type: "stage.entered", stage: "describe" },
      { type: "blocker", stage: "describe", what: "a" },
      { type: "blocker", stage: "describe", what: "b" },
      { type: "replan", stage: "describe", plan: ["x"], clears: ["a"] },
    ]));
    expect(s.roadmap.find((r: any) => r.stage === "describe").status).toBe("blocked");
    expect(s.blockers.map((b: any) => b.cleared)).toEqual([true, false]);
  });
  test("a replan that clears nothing leaves the stage blocked", () => {
    const s = fold(ev([
      { type: "stage.entered", stage: "describe" },
      { type: "blocker", stage: "describe", what: "a" },
      { type: "replan", stage: "describe", plan: ["x"] },
    ]));
    expect(s.roadmap.find((r: any) => r.stage === "describe").status).toBe("blocked");
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
    append(app, { type: "open", stage: "plan", q: "for the worker", waits_on: "t1" });
    const s = append(app, { type: "decision", stage: "plan", q: "who sells?", a: "organisers", next: { do: "ask about refunds", why: "it blocks the plan" } });
    const md = page(s);
    expect(md).toContain("**Now:** Plan it, visit 2");
    expect(md).toContain("**Next:** ask about refunds (it blocks the plan)");
    expect(md).toContain("- is a refund final?");
    expect(md).not.toContain("for the worker");
    expect(md).toContain("[~] **Plan it** (visited 2 times)");
    expect(md).toContain("    - visit 2: reopened from spike: refunds break a rule");
    expect(md).toContain("[~] **Spike what you doubt**");
    expect(md).toContain("[ ] **Describe it**");
    expect(md).toContain("- who sells? **organisers** (owner)");
    expect(readFileSync(conductor("ROADMAP.md"), "utf8")).toBe(md);
  });
});

describe("rebuild", () => {
  test("state.json and ROADMAP.md come back from the log alone", () => {
    init(app, "g");
    append(app, { type: "open", stage: "plan", q: "q?" }, "2026-11-26T10:00:00.000Z");
    const state = readFileSync(conductor("state.json"), "utf8"), md = readFileSync(conductor("ROADMAP.md"), "utf8");
    rmSync(conductor("state.json")); rmSync(conductor("ROADMAP.md"));
    rebuild(app);
    expect(readFileSync(conductor("state.json"), "utf8")).toBe(state);
    expect(readFileSync(conductor("ROADMAP.md"), "utf8")).toBe(md);
  });
  test("a line that is not JSON is named", () => {
    init(app, "g");
    appendFileSync(conductor("log.jsonl"), "not json\n");
    expect(() => readLog(app)).toThrow("log.jsonl line 3 is not JSON");
  });
});

describe("brief", () => {
  test("with no project, says to start with the conductor skill; quiet, it says nothing", () => {
    expect(brief(app)).toBe("orthograph conductor: no project yet. Start with the conductor skill.");
    expect(brief(app, true)).toBe("");
    expect(cli("brief", "--quiet")).toMatchObject({ code: 0, out: "" });
  });
  test("names the goal, the stage, what is done, next, what waits and running workers", () => {
    init(app, "g");
    append(app, { type: "stage.done", stage: "plan" });
    append(app, { type: "stage.entered", stage: "spike" });
    append(app, { type: "worker.started", stage: "spike", worker: "t1", role: "spike", task: "x" });
    append(app, { type: "open", stage: "spike", q: "q?", next: { do: "wait for t1" } });
    expect(brief(app).split("\n")).toEqual([
      'orthograph conductor: goal "g"',
      "now: Spike what you doubt, visit 1, doing",
      "done: plan",
      "next: wait for t1",
      "waiting: q?",
      "running workers: t1 spike",
    ]);
  });
});

describe("due: whether a scheduled wake has work", () => {
  test("no project is idle", () => {
    expect(due(app)).toEqual({ due: false, why: ["no project yet"] });
  });
  test("a stage in progress with a next step is due", () => {
    init(app, "g");
    expect(due(app)).toEqual({ due: true, why: ["carry on: plan it with the owner"] });
  });
  test("a stage waiting on the owner's answer is idle, and says what it waits on", () => {
    init(app, "g");
    append(app, { type: "open", stage: "plan", q: "is a refund final?" });
    expect(due(app)).toEqual({ due: false, why: ["waiting on the owner: is a refund final?"] });
  });
  test("a running worker is due even while the owner is asked something", () => {
    init(app, "g");
    append(app, { type: "open", stage: "plan", q: "q?" });
    append(app, { type: "worker.started", stage: "plan", worker: "w1", role: "spike", task: "x" });
    expect(due(app)).toEqual({ due: true, why: ["check on w1"] });
  });
  test("a question for another stage, or for a worker, does not hold this stage", () => {
    init(app, "g");
    append(app, { type: "open", stage: "describe", q: "later?" });
    append(app, { type: "open", stage: "plan", q: "for w2", waits_on: "w2" });
    expect(due(app).due).toBeTrue();
  });
  test("a blocked stage is due: the conductor looks for a way round", () => {
    init(app, "g");
    append(app, { type: "blocker", stage: "plan", what: "no network" });
    expect(due(app)).toEqual({ due: true, why: ["find a way round: no network"] });
  });
});

describe("the command line", () => {
  test("init, log, brief, show and rebuild, with --dir", () => {
    expect(cli("init", "sell tickets")).toMatchObject({ code: 0, out: "conductor started: sell tickets\n" });
    expect(cli("log", JSON.stringify({ type: "note", stage: "plan", text: "x" }))).toMatchObject({ code: 0, out: "logged #3; now plan, visit 1\n" });
    expect(cli("brief").out).toContain('goal "sell tickets"');
    expect(JSON.parse(cli("show").out).last).toBe(3);
    expect(cli("rebuild")).toMatchObject({ code: 0, out: "rebuilt from 3 events\n" });
  });
  test("a refused event exits 1 with the reason and writes nothing", () => {
    cli("init", "g");
    const r = cli("log", JSON.stringify({ type: "bogus" }));
    expect(r.code).toBe(1);
    expect(r.err).toContain("conductor-state: unknown event type bogus");
    expect(lines()).toHaveLength(2);
  });
  test("bad JSON exits 1; an unknown command prints usage and exits 2", () => {
    cli("init", "g");
    expect(cli("log", "{nope").code).toBe(1);
    const r = cli("frobnicate");
    expect(r.code).toBe(2);
    expect(r.err).toContain("usage:");
  });
  test("due exits 0 when there is work and 3 when there is not", () => {
    expect(cli("due")).toMatchObject({ code: 3, out: "idle: no project yet\n" });
    cli("init", "g");
    expect(cli("due")).toMatchObject({ code: 0, out: "due: carry on: plan it with the owner\n" });
  });
  test("the command line works when the script is reached through a symlinked folder", () => {
    const real = mkdtempSync(join(tmpdir(), "plug-")), link = join(mkdtempSync(join(tmpdir(), "via-")), "plugin");
    cpSync(SCRIPT, join(real, "conductor-state.mjs"));
    symlinkSync(real, link);
    const r = Bun.spawnSync(["node", join(link, "conductor-state.mjs"), "due", "--dir", app]);
    expect(r.exitCode).toBe(3);
    expect(r.stdout.toString()).toBe("idle: no project yet\n");
    rmSync(real, { recursive: true, force: true });
  });
  test("importing the module runs no command and writes nothing", () => {
    const r = Bun.spawnSync(["bun", "-e", `await import(${JSON.stringify(SCRIPT)})`], { cwd: app });
    expect(r.exitCode).toBe(0);
    expect(existsSync(join(app, ".orthograph"))).toBeFalse();
  });
});
