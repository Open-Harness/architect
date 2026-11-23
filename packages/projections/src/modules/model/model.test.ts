// The model projection: model.json is the compiler's model as it is, mounts included, and edges.json what depends on what.
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { model as projection } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), join(repo, "examples/acme")], { encoding: "utf8" })) as Model;

describe("model", () => {
  it("writes model.json and edges.json, and model.json says what the project mounted", async () => {
    expect(projection).toMatchObject({ kind: "projection", host: [], ships: ["kept"] });
    const files = await Effect.runPromise(projection.render({ name: "acme", model, mount: "model", mounts: model.mounts ?? {} }));
    expect(files.map((f) => f.path)).toEqual(["model.json", "edges.json"]);
    expect(JSON.parse(files[0]!.content)).toEqual(model);
    expect(Object.keys((JSON.parse(files[0]!.content) as Model).mounts ?? {}).sort()).toEqual(["api", "cli", "mcp", "model", "sdk", "server"]);
  });
});
