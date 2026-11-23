import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Registry } from "./service.ts";

const dir = mkdtempSync(join(tmpdir(), "ortho-registry-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

describe("Verdaccio, as a process", () => {
  it("answers on loopback, keeps its user's token in a private npmrc, never proxies the project's own names, and is gone with its scope", { timeout: 60_000 }, async () => {
    const scope = Effect.runSync(Scope.make());
    const registry = await Effect.runPromise(Registry.start({ dir }).pipe(Scope.provide(scope)));
    try {
      expect(registry.url).toBe(`http://127.0.0.1:${registry.port}/`);
      expect(alive(registry.pid)).toBe(true);
      expect((await fetch(`${registry.url}-/ping`)).ok).toBe(true);
      expect(statSync(registry.npmrc).mode & 0o777).toBe(0o600);
      expect(readFileSync(registry.npmrc, "utf8")).toMatch(new RegExp(`^//127\\.0\\.0\\.1:${registry.port}/:_authToken=\\S+\\n$`));
      // `acme` exists on npmjs.org; the project's own name is never asked of it, so here it is not found.
      expect((await fetch(`${registry.url}acme`)).status).toBe(404);
      expect((await fetch(`${registry.url}@orthograph%2fnothing`)).status).toBe(404);
    } finally { await Effect.runPromise(Scope.close(scope, Exit.void)); }
    expect(alive(registry.pid)).toBe(false);
  });
});
