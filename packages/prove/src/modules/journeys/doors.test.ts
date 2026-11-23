// Goal 17 slice 9: a journey's steps through the harness's doors (GOAL17-check-harness, call 0) against a real world: the world's own routes,
// a stand-in's `/_stand/*`, calls made together, and the runner's kill and start. A world prove did not start refuses what needs its runner.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Blueprint, Probe, Stand, expect as want } from "orthograph";
import type { Operation } from "orthograph";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { acmeCopy } from "../../../test/acme.ts";
import { Worlds } from "#modules/world/service.js";
import { standProcess } from "#modules/world/internal/stands.js";
import { Journeys } from "./service.ts";

const project = acmeCopy();
afterAll(project.remove);

const tiny = `
import { createServer } from "node:http";
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ path: req.url, got: body === "" ? null : JSON.parse(body) })); });
});
server.listen(0, "127.0.0.1", () => console.log("stand-in listening on http://127.0.0.1:" + server.address().port));
`;

const hello = Stand.command<{ n: number }, { path: string; got: { n: number } }>("echo", "hello");
const health = Probe.read<{}, unknown>("health");

describe("a journey through the doors", () => {
  it("reads a probe, commands a stand-in, calls together, kills the runner and starts it again", { timeout: 300_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const loaded = yield* Compiler.model.pipe(Effect.provide(nodeSource(project.root)), Effect.flatMap((m) => Journeys.load(project.root, m)));
      const create = loaded.operations.get("organization.create") as Operation;
      const dir = mkdtempSync(join(tmpdir(), "ortho-doors-test-"));
      yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })));
      writeFileSync(join(dir, "stand.mjs"), tiny);
      const world = yield* Worlds.start({ root: project.root, port: 0, name: "doors-test", stands: { echo: standProcess("echo", join(dir, "stand.mjs"), dir) } });
      const journey = Blueprint.journey("the doors", {
        cast: { ada: Blueprint.signedIn },
        steps: (s) => [
          s.step("the world answers its own route", health({}), want((a) => a).toMatch(/.*/)),
          s.step("a stand-in answers its command", hello({ n: 1 }), want((a) => a.got.n).toBe(1), want((a) => a.path).toMatch(/_stand\/hello/)),
          s.step("two calls at once, each answered", s.together(s.ada.run(create, { name: "One", cap: 10n }), s.ada.run(create, { name: "Two", cap: 10n })),
            want((a) => a.answers.length).toBe(2), want((a) => a.answers.every((x: { organization?: string }) => typeof x.organization === "string")).toBe(true)),
          s.step("the runner is killed", s.runner.kill(), want((a) => a.pid > 0).toBe(true)),
          s.step("and started again", s.runner.start(), want((a) => a.pid > 0).toBe(true)),
          s.step("ada is still known", s.ada.run(create, { name: "Three", cap: 10n }), want((a) => typeof a.organization).toBe("string")),
        ],
      });
      const run = yield* Journeys.run(loaded, world.url, journey as never, 0, "world", undefined, false, undefined, { runner: world.runner, stands: world.stands });
      expect(run.stopped).toBeUndefined();
      expect(run.steps.map((s) => [s.title, s.failures])).toEqual(run.steps.map((s) => [s.title, []]));
      expect(run.steps).toHaveLength(6);
      // A world prove did not start has no runner: the step is refused, naming it, and nothing pretends.
      const refused = yield* Journeys.run(loaded, world.url, journey as never, 1, "world", undefined, false, undefined, { stands: world.stands });
      expect(refused.stopped).toMatch(/no runner to kill/);
    }))));
});

