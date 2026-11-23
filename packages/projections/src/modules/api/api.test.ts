// The api projection: acme's contract, rendered through the mount, is what acme has committed under generated/api/.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { api } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), acme], { encoding: "utf8" })) as Model;

describe("api", () => {
  it("renders every file of generated/api/, relative to it, and nothing outside it", async () => {
    expect(api).toMatchObject({ kind: "projection", host: [], ships: ["kept"] });
    const files = await Effect.runPromise(api.render({ name: "acme", model, mount: "api", mounts: model.mounts ?? {} }));
    expect(files.map((f) => f.path)).toContain("src/index.ts");
    for (const f of files) {
      expect(f.path.startsWith("generated/"), f.path).toBe(false);
      expect(f.content, f.path).toBe(readFileSync(join(acme, "generated/api", f.path), "utf8").replace(/^\/\/ Generated from blueprint\/projections\/api\.ts\./, "// Generated from the blueprint."));
    }
  });

  it("is refused under another mount name", async () => {
    const made = await Effect.runPromise(Effect.result(api.render({ name: "acme", model, mount: "contract", mounts: {} })));
    expect(made._tag).toBe("Failure");
  });
});
