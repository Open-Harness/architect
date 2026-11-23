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

  it("has an empty twin for prove, with a scaffold for each operation the project writes", () => {
    const files = emptyServer(model, "acme");
    expect(files.filter((f) => f.scaffold).length).toBe(Object.values(model.operations).filter((o) => o.kind === "operation").length);
  });
});
