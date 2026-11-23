// The mcp projection: acme's catalog, rendered through the mount, is what acme has committed under generated/mcp/, and a tool
// follows `via`: an operation a mount narrowed out of the agent has none.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { mcp } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), acme], { encoding: "utf8" })) as Model;
const render = (m: Model) => Effect.runPromise(mcp.render({ name: "acme", model: m, mount: "mcp", mounts: m.mounts ?? {} }));

describe("mcp", () => {
  it("renders generated/mcp/ relative to it, as acme has it committed", async () => {
    expect(mcp).toMatchObject({ kind: "projection", host: [], ships: ["kept"] });
    const files = await render(model);
    expect(files.map((f) => f.path)).toEqual(["src/index.ts"]);
    expect(files[0]!.content).toBe(readFileSync(join(acme, "generated/mcp/src/index.ts"), "utf8").replace(/^\/\/ Generated from blueprint\/projections\/mcp\.ts\./, "// Generated from the blueprint."));
  });

  it("has no tool for an operation narrowed out of the agent", async () => {
    const narrowed: Model = { ...model, operations: { ...model.operations, "allowance.spend": { ...model.operations["allowance.spend"]!, via: ["key"] } } };
    const text = (await render(narrowed))[0]!.content;
    expect(text).not.toContain('"allowance.spend": {');
    expect(text).toContain('"allowance.grant": {');
  });

  it("is refused under another mount name", async () => {
    const made = await Effect.runPromise(Effect.result(mcp.render({ name: "acme", model, mount: "tools", mounts: {} })));
    expect(made._tag).toBe("Failure");
  });
});
