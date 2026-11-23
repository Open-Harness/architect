// The server projection: acme's Worker, rendered through the mount, is what acme has committed under generated/server/.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { emptyServer, server } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), acme], { encoding: "utf8" })) as Model;
const render = (mount: string) => Effect.runPromise(Effect.result(server.render({ name: "acme", model, mount, mounts: model.mounts ?? {} })));

describe("server", () => {
  it("is a worker projection that ships as a deploy, and its mount is the one thing that writes generated/server/", async () => {
    expect(server).toMatchObject({ kind: "projection", host: ["worker"], ships: ["deploy"] });
    const made = await render("server");
    expect(made._tag).toBe("Success");
    const files = made._tag === "Success" ? made.success : [];
    expect(files.map((f) => f.path)).toEqual(expect.arrayContaining(["main.ts", "wrangler.jsonc", "migrations/0001_things.sql"]));
    for (const f of files) {
      // What a mount writes is this, with its first line naming the mount: the generators say that, not the projection.
      expect(f.content, f.path).toBe(readFileSync(join(acme, "generated/server", f.path), "utf8").replace(/^\/\/ Generated from blueprint\/projections\/server\.ts\./, "// Generated from the blueprint."));
    }
  });

  it("refuses to be mounted under a name the other tools don't read, naming the file it belongs in", async () => {
    const made = await render("worker");
    expect(made._tag).toBe("Failure");
    expect(String(made._tag === "Failure" ? (made.failure as { readonly message?: string }).message : "")).toContain("mount it as blueprint/projections/server.ts");
  });

  it("wraps its entry in the world's time, and sets ORTHO_CLOCKS, only for a stepped or scaled environment (M8.06); no clock, or a real one, is what it always was", async () => {
    const withClock = (clock?: NonNullable<Model["environments"]>[string]["clock"]): Model => ({
      ...model,
      environments: { ...model.environments, local: { ...model.environments!["local"]!, ...(clock ? { clock } : {}) } },
    });
    const rendered = (m: Model) => Effect.runPromise(server.render({ name: "acme", model: m, mount: "server", mounts: m.mounts ?? {} }));
    const file = (files: ReadonlyArray<{ readonly path: string; readonly content: string }>, path: string) => files.find((f) => f.path === path)!.content;
    const plain = await rendered(model);
    for (const same of [withClock(), withClock({ kind: "real" })]) expect(await rendered(same)).toEqual(plain);
    expect(file(plain, "main.ts")).not.toContain("WorldEntry");
    expect(file(plain, "main.ts")).toContain("BusyLive");
    expect(file(plain, "main.ts")).not.toContain("Timers");
    expect(file(plain, "wrangler.jsonc")).not.toContain("ORTHO_CLOCKS");

    const stepped = await rendered(withClock({ kind: "stepped", starts: "2027-01-10T09:00:00.000Z" }));
    expect(file(stepped, "main.ts")).toContain("export default WorldEntry.entry<Env>({");
    expect(file(stepped, "main.ts")).toContain("import { AuthD1, Database, JournalD1, StoreD1, Telemetry, WorldEntry, toWorld }");
    expect(file(stepped, "wrangler.jsonc")).toContain(`"ORTHO_CLOCKS": "{\\"local\\":{\\"kind\\":\\"stepped\\",\\"starts\\":\\"2027-01-10T09:00:00.000Z\\"}}"`);
    // Its work is the world's (M8.07): counted and timed through the world's Durable Object, and handlers are given Timers.
    expect(file(stepped, "main.ts")).toContain("WorldEntry.work(env, wakes)");
    expect(file(stepped, "main.ts")).toContain("export class World extends WorldHost");
    expect(file(stepped, "main.ts")).toContain("const wakes: WorldWakes = {};");
    expect(file(plain, "main.ts")).toContain("export { World } from");
    expect(file(stepped, "main.ts")).not.toContain("BusyLive");
    expect(file(stepped, "main.ts")).toContain("Auth, Timers, DurableTimers)");
    // Only those two files differ.
    expect(stepped.filter((f) => f.content !== plain.find((p) => p.path === f.path)?.content).map((f) => f.path).sort()).toEqual(["main.ts", "wrangler.jsonc"]);
  });

  it("has an empty twin for prove, with a scaffold for each operation the project writes", () => {
    const files = emptyServer(model, "acme");
    expect(files.filter((f) => f.scaffold).length).toBe(Object.values(model.operations).filter((o) => o.kind === "operation").length);
  });
});
