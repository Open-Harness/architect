// Goal 17 slice 9: the world's runner (kill, start on the same state) and the stand-ins beside it (GOAL17-check-harness, call 2).
import { acmeCopy } from "../../../test/acme.ts";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Worlds } from "./service.ts";
import { standProcess } from "./internal/stands.ts";

const project = acmeCopy();
afterAll(project.remove);

const alive = (pid: number) => {
  try { process.kill(pid, 0); return true; } catch { return false; }
};
const answers = (url: string) => Effect.promise(() => fetch(`${url}/_world/health`, { signal: AbortSignal.timeout(1500) }).then((r) => r.ok, () => false));
const post = (url: string, path: string, body: unknown, token?: string) =>
  Effect.promise(() => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: (await r.json()) as Record<string, unknown> })));

/** A stand-in as small as the contract: it says where it listens, and echoes what a command sends. */
const tiny = `
import { createServer } from "node:http";
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ path: req.url, got: body === "" ? null : JSON.parse(body) })); });
});
server.listen(0, "127.0.0.1", () => console.log("stand-in listening on http://127.0.0.1:" + server.address().port));
`;

describe("the runner of a world", () => {
  it("a killed runner is gone with its group, a stand-in beside it lives, and a started one keeps the same state", { timeout: 240_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const dir = mkdtempSync(join(tmpdir(), "ortho-runner-test-"));
      yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })));
      writeFileSync(join(dir, "stand.mjs"), tiny);
      const { url, runner, stands } = yield* Worlds.start({ root: project.root, port: 0, name: "runner-test", stands: { echo: standProcess("echo", join(dir, "stand.mjs"), dir) } });
      expect(yield* answers(url)).toBe(true);
      const cast = (yield* post(url, "/_world/cast", { names: ["ada"] })).body as Record<string, { person: string; token: string }>;
      const made = yield* post(url, "/organization/create", { name: "Acme Demo", cap: "1000" }, cast["ada"]!.token);
      expect(made.status).toBe(200);

      const echoed = yield* Effect.promise(() => fetch(`${stands["echo"]!.url}/_stand/hello`, { method: "POST", body: JSON.stringify({ n: 1 }) }).then((r) => r.json()));
      expect(echoed).toEqual({ path: "/_stand/hello", got: { n: 1 } });

      const killed = yield* runner.kill();
      expect(killed.pid).toBeGreaterThan(0);
      expect(alive(killed.pid)).toBe(false);
      expect(yield* answers(url)).toBe(false);
      expect(alive(stands["echo"]!.pid)).toBe(true);

      yield* runner.start;
      expect(yield* answers(url)).toBe(true);
      // The same state, the same secret: ada's token still signs her in, and her organisation is still there to be granted from.
      const again = yield* post(url, "/organization/create", { name: "Acme Two", cap: "1000" }, cast["ada"]!.token);
      expect(again.status).toBe(200);
      expect(again.body["organization"]).not.toBe(made.body["organization"]);
      const running = yield* runner.start.pipe(Effect.flip);
      expect(running.message).toMatch(/running/);
    }))));
});
