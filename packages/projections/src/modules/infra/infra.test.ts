// The infra projection: Plugged In's stack, rendered through the mount, is what it has committed under generated/infra/; the model decides the bindings.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { infra } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const project = join(repo, "examples/plugged-in");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), project], { encoding: "utf8" })) as Model;
const render = (m: Model, mount = "infra") => Effect.runPromise(infra.render({ name: "plugged-in", model: m, mount, mounts: m.mounts ?? {} }));

describe("infra", () => {
  it("is a kept projection, and its mount writes generated/infra/alchemy.run.ts as Plugged In has it committed", async () => {
    expect(infra).toMatchObject({ kind: "projection", host: [], ships: ["kept"] });
    const files = await render(model);
    expect(files.map((f) => f.path)).toEqual(["alchemy.run.ts"]);
    expect(files[0]!.content).toBe(readFileSync(join(project, "generated/infra/alchemy.run.ts"), "utf8").replace(/^\/\/ Generated from blueprint\/projections\/infra\.ts\./, "// Generated from the blueprint."));
  });

  it("forms no name of its own: the plan's names are read at run time", async () => {
    const text = (await render(model))[0]!.content;
    expect(text).not.toMatch(/ortho-|-stg-|-worker/);
    expect(text).toContain("ORTHO_STAGING_INPUT");
  });

  it("binds a Durable Object namespace for actors only when a thing lives as one, and a database for each store", async () => {
    const plain = (await render(model))[0]!.content;
    expect(plain).toContain(`World: "WORLD"`);
    expect(plain).not.toContain("ACTORS");
    const actor: Model = { ...model, things: { ...model.things, ghost: { ...Object.values(model.things)[0]!, name: "ghost", lives: "actor" } } };
    expect((await render(actor))[0]!.content).toContain(`Actor: "ACTORS"`);
    const stored: Model = { ...model, stores: { ledger: { name: "ledger", kind: "database" } } as unknown as NonNullable<Model["stores"]> };
    expect((await render(stored))[0]!.content).toContain(`DB_LEDGER: "../server/migrations/ledger"`);
  });

  it("refuses to be mounted under a name the other tools don't read", async () => {
    await expect(render(model, "cloud")).rejects.toMatchObject({ message: expect.stringContaining("mount it as blueprint/projections/infra.ts") });
  });
});
