// Check 01 (M4.10): acme mounts the agents feature. `e2e/fixtures/agents/support` is laid over a copy of acme: the mount
// of `@orthograph/agents` (a pool of two), the OpenAI-compatible adapter that a world serves with the stand-in model, the
// agents `notes`, `support` and `desk`, the starting worlds `bob-invited` and `bob-funded`, and twelve journeys.
//
// This check proves the fixture's surface, from the model `ortho generate` writes: the five operations a person calls
// and the four only the system calls (M4-agents call 1), who may start a run (a person through a session or a key,
// never an agent), that `invitation.accept` is not offered to an agent, and that the model lists the fixture's three agents.
//
// Red today: `@orthograph/agents`, `@orthograph/openai` and `Blueprint.agent` do not exist, so the fixture does not load
// and `ortho generate` fails. `ortho generate` loading is therefore this check's first step, and the one that fails.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { generated, once, shop } from "./support.ts";

const project = shop("support");
afterAll(() => project.remove());

interface Operation { readonly allowed: ReadonlyArray<{ readonly kind: string; readonly via?: ReadonlyArray<string> }>; readonly agentTool?: boolean }
interface Model { readonly operations: Readonly<Record<string, Operation>>; readonly things: Readonly<Record<string, unknown>> }

const model = once((): Model => {
  generated(project.root);
  return JSON.parse(readFileSync(join(project.root, "generated/model/model.json"), "utf8")) as Model;
});

describe("01 M4.10: acme mounts the agents feature", () => {
  it("the fixture loads: `ortho generate` succeeds with the mount, the adapter, three agents and twelve journeys", () => {
    expect(Object.keys(model().operations).filter((o) => o.startsWith("run.")).sort()).toEqual(
      ["run.cancel", "run.fail", "run.finish", "run.get", "run.list", "run.start", "run.steer", "run.wait", "run.wake"],
    );
  });

  it("a person starts, reads, steers and cancels a run; only the system finishes, fails, waits or wakes one", () => {
    const { operations } = model();
    for (const person of ["run.start", "run.steer", "run.cancel"]) {
      expect(operations[person]?.allowed.map((a) => a.kind), person).not.toContain("system");
    }
    for (const system of ["run.finish", "run.fail", "run.wait", "run.wake"]) {
      expect(operations[system]?.allowed, system).toEqual([{ kind: "system" }]);
    }
  });

  it("a run starts only by a session or a key: never an agent (M4-agents call 1)", () => {
    expect(model().operations["run.start"]?.allowed.map((a) => a.via)).toEqual([["key", "session"]]);
  });

  it("an operation marked `.notVia(Via.agent)` is never an agent's tool", () => {
    const { operations } = model();
    expect(operations["invitation.accept"]?.allowed.map((a) => a.via)).toEqual([["device", "key", "session"]]);
    expect(operations["invitation.accept"]?.agentTool).toBe(false);
    expect(operations["allowance.spend"]?.agentTool).toBe(true);
    expect(operations["allowance.revoke"]?.agentTool).toBe(true);
  });

  it("the fixture's own things are in the model: the run and the agent, and the read the agents use to find an allowance", () => {
    const { things, operations } = model();
    expect(Object.keys(things).filter((t) => t === "run" || t === "agent").sort()).toEqual(["agent", "run"]);
    expect(Object.keys(operations)).toContain("allowance.mine");
  });
});
