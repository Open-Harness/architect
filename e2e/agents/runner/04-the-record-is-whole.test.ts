// Check 04 (M4.03): the record is whole (H2.2). Everything an analysis needs is in `record.json`, as numbers and hashes (never
// text), and each field is judged against a value the check knows: the brief's hash against `ortho brief`'s own output, the
// prompt and skill hashes against the config the check passed in, the totals against turns the check planted in a runner of
// its own, the commit against git.
//
// Two runs with different inputs are compared, so a record that hard-codes a value, or echoes the first config for every
// run, fails. Turns and cost need a model, and no key exists in this goal, so they are planted: a runner of our own returns
// three turns (then one), and the record's turns and totals must be exactly their sums.
//
// Spans: H2.2 reads a run's and the scorer's spans back from the Collector by trace id. That needs no key, so it is judged
// here: `traces.run` and `traces.score` are two 32-hex trace ids, and `spans.jsonl` holds a span `agent.run` of the first
// and a span `agent.score` of the second. H2 names neither span; the names are chosen here (README.md). The SDK's own spans,
// and that a record's turns and cost equal the SDK's result message, need ANTHROPIC_API_KEY and are not checked here.
//
// Red today because `@orthograph/agents` does not exist. Slice 3 (M4.03) turns it green.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { baseConfig, briefOf, execute, files, git, lines, modified, put, reference, runnerOf, runsDir, sha256, taskOf, text, type RunConfig, type RunOutcome } from "./support.ts";

const SPEND = "allowance.spend";
const runs = runsDir();
afterAll(runs.remove);

const configA: RunConfig = {
  provider: "planted", model: "model-a", thinking: "high", systemPrompt: "You write one handler.",
  skills: [{ name: "records", text: "# Records\nUse Records.update." }, { name: "refusals", text: "# Refusals\nReturn declared errors." }],
  limits: { maxTurns: 40, maxUsd: 1, wallMs: 600_000 },
};
const configB: RunConfig = {
  provider: "other", model: "model-b", thinking: "off", systemPrompt: "Another prompt.",
  skills: [{ name: "only", text: "one skill" }], limits: { maxTurns: 7, maxUsd: 0.5, wallMs: 90_000 },
};
const call = (name: string, ms: number, isError: boolean) => ({ name, argsHash: sha256(`${name}${ms}`), ms, isError });
const threeTurns: RunOutcome = {
  status: "done", usdSource: "provider", transcript: ['{"role":"user"}', '{"role":"assistant"}'],
  turns: [
    { ms: 1200, stop: "tool_use", usage: { input: 1000, output: 200, thinking: 50, cacheRead: 300, cacheWrite: 100, usd: 0.25 }, toolCalls: [call("read", 30, false), call("check", 900, true)] },
    { ms: 800, stop: "tool_use", usage: { input: 2000, output: 400, thinking: 0, cacheRead: 600, cacheWrite: 0, usd: 0.5 }, toolCalls: [call("write_handler", 5, false), call("check", 700, false)] },
    { ms: 500, stop: "end_turn", usage: { input: 3000, output: 100, thinking: 25, cacheRead: 0, cacheWrite: 0, usd: 0.125 }, toolCalls: [] },
  ],
};
const oneTurn: RunOutcome = {
  status: "turns", reason: "maxTurns 7", usdSource: "table", transcript: ['{"role":"user"}'],
  turns: [{ ms: 77, stop: "max_tokens", usage: { input: 11, output: 22, thinking: 3, cacheRead: 4, cacheWrite: 5, usd: 0.0625 }, toolCalls: [call("read", 9, true)] }],
};
const planted = (outcome: RunOutcome) => runnerOf("sdk", (task, sandbox) => {
  put(sandbox.root, task.handler, reference(task.project, task.operation));
  return outcome;
});

describe("04 M4.03: the record is whole", () => {
  it("who ran what: the runner, the config echoed, the prompt and skill hashes, the brief's hash, and the repository's commit", async () => {
    const task = await taskOf("acme", SPEND);
    const brief = briefOf("acme", SPEND);
    expect(brief).toContain("allowance.spend");
    const a = await execute({ task, runner: planted(threeTurns), config: configA, runsDir: runs.dir, suite: "whole" });
    const b = await execute({ task, runner: planted(oneTurn), config: configB, runsDir: runs.dir, suite: "whole" });
    for (const [run, config, outcome] of [[a, configA, threeTurns], [b, configB, oneTurn]] as const) {
      const r = run.record;
      expect(run.folder).toBe(`${runs.dir}/whole/${r.id}`);
      expect(r.suite).toBe("whole");
      expect(r.agent).toMatchObject({ runner: "sdk", provider: config.provider, model: config.model, thinking: config.thinking, limits: config.limits, sandbox: "copy" });
      expect(r.agent.systemPromptHash).toBe(sha256(config.systemPrompt));
      expect(r.agent.skills).toEqual(config.skills.map((s) => ({ name: s.name, hash: sha256(s.text) })));
      expect(r.task.brief.hash).toBe(sha256(brief));
      expect(r.task).toMatchObject({ project: "acme", operation: SPEND, variant: "blank" });
      expect(r.outcome).toEqual(outcome.reason === undefined ? { status: outcome.status } : { status: outcome.status, reason: outcome.reason });
      // The commit the run was made at (H2: a dirty tree never makes a baseline, so the record says whether it was).
      expect(r.repo.commit).toBe(git("rev-parse", "HEAD"));
      expect(r.repo.dirty).toBe(git("status", "--porcelain") !== "");
      // The record holds hashes, never text: the prompt, the skills and the brief are not in it.
      const raw = text(run.folder, "record.json");
      for (const secret of [config.systemPrompt, ...config.skills.map((s) => s.text), brief]) expect(raw).not.toContain(secret);
    }
    expect(a.record.agent.systemPromptHash).not.toBe(b.record.agent.systemPromptHash);
    expect(a.record.id).not.toBe(b.record.id);
  });

  it("when: started and ended as ISO instants, and ms is the difference, near the moment the record was written", async () => {
    const before = Date.now();
    const { record, folder } = await execute({ task: await taskOf("acme", SPEND), runner: planted(threeTurns), config: configA, runsDir: runs.dir });
    const after = Date.now();
    for (const at of [record.startedAt, record.endedAt]) expect(new Date(at).toISOString()).toBe(at);
    expect(Date.parse(record.endedAt) - Date.parse(record.startedAt)).toBe(record.ms);
    expect(record.ms).toBeGreaterThanOrEqual(0);
    expect(Date.parse(record.startedAt)).toBeGreaterThanOrEqual(before - 1000);
    expect(Date.parse(record.endedAt)).toBeLessThanOrEqual(after + 1000);
    expect(modified(join(folder, "record.json"))).toBeGreaterThanOrEqual(Date.parse(record.endedAt) - 1000);
  });

  it("turns and cost: each planted turn is in the record, numbered from 1, and the totals are exactly their sums", async () => {
    const task = await taskOf("acme", SPEND);
    const a = (await execute({ task, runner: planted(threeTurns), config: configA, runsDir: runs.dir })).record;
    expect(a.turns).toEqual(threeTurns.turns.map((t, i) => ({ n: i + 1, ...t })));
    expect(a.totals).toEqual({ turns: 3, toolCalls: 4, toolErrors: 1, input: 6000, output: 700, usd: 0.875, usdSource: "provider", restarts: 0 });
    const b = (await execute({ task, runner: planted(oneTurn), config: configB, runsDir: runs.dir })).record;
    expect(b.turns).toEqual([{ n: 1, ...oneTurn.turns[0] }]);
    expect(b.totals).toEqual({ turns: 1, toolCalls: 1, toolErrors: 1, input: 11, output: 22, usd: 0.0625, usdSource: "table", restarts: 0 });
    // A run that wrote the right handler is solved whatever the model spent or said: cost is never folded into the score.
    expect(a.solved && b.solved).toBe(true);
    for (const f of [a.friction, b.friction]) for (const n of [f.deniedReads, f.checkRunsBeforePass, f.checkFailures]) expect(Number.isInteger(n) && n >= 0).toBe(true);
  });

  it("a runner that spends nothing leaves no turns and zero totals", async () => {
    const { record } = await execute({ task: await taskOf("acme", SPEND), runner: planted({ status: "done", usdSource: "table", transcript: [], turns: [] }), config: baseConfig, runsDir: runs.dir });
    expect(record.turns).toEqual([]);
    expect(record.totals).toEqual({ turns: 0, toolCalls: 0, toolErrors: 0, input: 0, output: 0, usd: 0, usdSource: "table", restarts: 0 });
  });

  it("the transcript is kept line for line, and a key the run was told to redact is nowhere in the folder", async () => {
    const key = "sk-test-planted-not-a-real-key-0001";
    const near = "sk-test-planted-not-a-real-key-0002";
    const transcript = [`{"role":"user","text":"x-api-key: ${key}"}`, `{"role":"assistant","text":"${near}"}`, '{"role":"tool","text":"plain"}'];
    const { record, folder } = await execute({
      task: await taskOf("acme", SPEND), runner: planted({ status: "done", usdSource: "table", turns: [], transcript }),
      config: baseConfig, runsDir: runs.dir, redact: [key],
    });
    const kept = lines(folder, "transcript.jsonl");
    expect(kept.length).toBe(3);
    for (const l of kept) expect(() => JSON.parse(l)).not.toThrow();
    expect(kept[0]).toContain('"text":"x-api-key: ');
    expect(kept[1]).toBe(transcript[1]);
    expect(kept[2]).toBe(transcript[2]);
    // Everything written but the agent's own output (its files are the work, scored as written) is free of it.
    for (const f of files(folder).filter((n) => !n.startsWith("output/"))) expect(readFileSync(join(folder, f), "utf8"), f).not.toContain(key);
    expect(record.id.length).toBeGreaterThan(0);
  });

  it("spans: the run and the scorer each have a trace id, and their spans are read back from the Collector into spans.jsonl", async () => {
    const { record, folder } = await execute({ task: await taskOf("acme", SPEND), runner: planted(threeTurns), config: configA, runsDir: runs.dir });
    expect(record.traces.run).toMatch(/^[0-9a-f]{32}$/);
    expect(record.traces.score).toMatch(/^[0-9a-f]{32}$/);
    expect(record.traces.run).not.toBe(record.traces.score);
    const spans = lines(folder, "spans.jsonl").map((l) => JSON.parse(l) as { traceId: string; spanId: string; name: string });
    expect(spans.length).toBeGreaterThan(0);
    for (const s of spans) expect([record.traces.run, record.traces.score]).toContain(s.traceId);
    expect(spans.filter((s) => s.name === "agent.run").map((s) => s.traceId)).toEqual([record.traces.run]);
    expect(spans.filter((s) => s.name === "agent.score").map((s) => s.traceId)).toEqual([record.traces.score]);
    for (const l of lines(folder, "logs.jsonl")) expect(() => JSON.parse(l)).not.toThrow();
    // Two runs, two sets of ids.
    const again = await execute({ task: await taskOf("acme", SPEND), runner: planted(oneTurn), config: configB, runsDir: runs.dir });
    expect(again.record.traces.run).not.toBe(record.traces.run);
  });
});
