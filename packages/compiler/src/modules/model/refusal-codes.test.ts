// Public compiler admission checks: real temporary blueprint modules, with no generator, fixture or runtime edits.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

// Separate from model.test.ts's scratch tree, which that suite removes as a whole while files may run in parallel.
const scratch = resolve(import.meta.dirname, "../../../.ortho/refusal-namespace");

const blueprint = (name: string, prefix?: string, errorCount = 1, machine = false): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "project-"));
  const thing = join(root, "blueprint/things", name);
  mkdirSync(thing, { recursive: true });
  writeFileSync(join(thing, "thing.ts"), `import { Blueprint } from "orthograph";
export const Subject = Blueprint.thing({ description: "A compiler input.", fields: { id: Blueprint.id("subject") }${prefix ? `, code: "${prefix}"` : ""} });
`);
  writeFileSync(join(thing, "errors.ts"), `import { Blueprint } from "orthograph";\n${Array.from({ length: errorCount }, (_, i) => `export class Refusal${i + 1} extends Blueprint.error({}, { exit: 41 }) {}`).join("\n")}\n`);
  if (machine) writeFileSync(join(thing, "machine.ts"), `import { Blueprint } from "orthograph";
import { Subject } from "./thing.ts";
export const machine = Blueprint.machine(Subject, { states: ["active"], moves: {}, notFrom: { exit: 40 } });
`);
  return root;
};

const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("refusal code admission", () => {
  it("rejects an explicit prefix reserved by a runtime refusal, with the declaration and recovery", async () => {
    const exit = await modelOf(blueprint("widget", "AR"));
    expect(Exit.isFailure(exit)).toBe(true);
    const message = JSON.stringify(exit);
    expect(message).toContain("blueprint/things/widget/thing.ts");
    expect(message).toContain("AR-");
    expect(message).toContain("reserved for runtime refusals");
    expect(message).toContain("code");
    expect(message).toContain("distinct prefix");
  });

  it.each(["article", "archive"])("rejects %s's automatic runtime prefix and asks for an explicit code", async (name) => {
    const exit = await modelOf(blueprint(name));
    expect(Exit.isFailure(exit)).toBe(true);
    const message = JSON.stringify(exit);
    expect(message).toContain(`blueprint/things/${name}/thing.ts`);
    expect(message).toContain("AR-");
    expect(message).toContain("reserved for runtime refusals");
    expect(message).toContain("distinct prefix");
  });

  it("accepts a distinct explicit prefix without changing runtime or declared codes", async () => {
    const exit = await modelOf(blueprint("article", "AT", 1, true));
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) return;
    expect(exit.value.refusals).toEqual({ ArticleNotActive: "AT-900", IdempotencyConflict: "AR-002", NotAllowed: "AR-001", Refusal1: "AT-001" });
  });

  it("rejects duplicate emitted codes when a declared error reaches the machine's reserved number", async () => {
    const exit = await modelOf(blueprint("article", "AT", 900, true));
    expect(Exit.isFailure(exit)).toBe(true);
    const message = JSON.stringify(exit);
    expect(message).toContain("AT-900");
    expect(message).toContain("Refusal900");
    expect(message).toContain("ArticleNotActive");
    expect(message).toContain("refusal codes must be unique");
  });
});
