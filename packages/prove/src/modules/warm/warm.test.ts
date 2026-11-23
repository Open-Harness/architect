// A warm world's record: when it is found, and when it is not (ST1.24). The end-to-end check is e2e/m1/30-st1-24-warm-world.test.ts.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Warm } from "./service.ts";
import { fingerprint } from "./internal/source.ts";

const NONCE = "the-nonce";
const root = mkdtempSync(join(tmpdir(), "warm-"));
mkdirSync(join(root, "src"), { recursive: true });
writeFileSync(join(root, "src/handler.ts"), "export {};\n");
let server: Server;
let url = "";

beforeAll(async () => {
  server = createServer((_, response) => response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, nonce: NONCE })));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(root, { recursive: true, force: true });
});

const record = (over: Partial<{ pid: number; url: string; startedAt: number; sources: string; nonce: string }> = {}) => ({ pid: process.pid, url, collector: "http://127.0.0.1:1", telemetry: join(root, ".ortho/dev-telemetry"), startedAt: Date.now() + 1000, sources: fingerprint(root), nonce: NONCE, ...over });
const published = <A>(r: ReturnType<typeof record>, use: () => Promise<A>) =>
  Effect.runPromise(Effect.scoped(Warm.publish(root, r).pipe(Effect.andThen(Effect.promise(use)))));
const found = () => Effect.runPromise(Warm.find(root));

describe("warm", () => {
  it("finds the record of a live dev whose world answers and whose source is older than it, and removes it when dev stops", async () => {
    const r = record();
    expect(await published(r, found)).toEqual(r);
    expect(existsSync(join(root, ".ortho/dev.json"))).toBe(false);
    expect(await found()).toBeUndefined();
  });

  it("does not find a record whose process is gone, or whose world does not answer", async () => {
    expect(await published(record({ pid: 2 ** 22 + 1 }), found)).toBeUndefined();
    expect(await published(record({ url: "http://127.0.0.1:1" }), found)).toBeUndefined();
  });

  it("does not find a record once the source changed after dev began: the world may not have reloaded it", async () => {
    const later = new Date(Date.now() + 60_000);
    utimesSync(join(root, "src/handler.ts"), later, later);
    expect(await published(record(), found)).toBeUndefined();
  });

  it("does not find a record once a source file was deleted, added or renamed after dev began, though no file is newer", async () => {
    const past = new Date(Date.now() - 60_000);
    const handler = join(root, "src/handler.ts");
    const helper = join(root, "src/helper.ts");
    utimesSync(handler, past, past);
    const before = record();
    expect(await published(before, found), "nothing changed").toEqual(before);
    writeFileSync(helper, "export const helper = 1;\n");
    utimesSync(helper, past, past);
    expect(await published(before, found), "an added file").toBeUndefined();
    const withHelper = record();
    expect(await published(withHelper, found), "the helper was there when dev began").toEqual(withHelper);
    rmSync(helper);
    expect(await published(withHelper, found), "a deleted file").toBeUndefined();
    renameSync(handler, join(root, "src/renamed.ts"));
    expect(await published(before, found), "a renamed file").toBeUndefined();
    renameSync(join(root, "src/renamed.ts"), handler);
    utimesSync(handler, past, past);
    expect(await published(before, found), "put back").toEqual(before);
  });

  it("looks at the config, the lockfile and the environment files too: a deleted .env or a generated file stops a warm prove", async () => {
    const past = new Date(Date.now() - 60_000);
    mkdirSync(join(root, "generated/server"), { recursive: true });
    for (const file of ["generated/server/main.ts", ".env.local", "ortho.config.ts", "pnpm-lock.yaml", "package.json"]) {
      writeFileSync(join(root, file), "x\n");
      utimesSync(join(root, file), past, past);
    }
    utimesSync(join(root, "src/handler.ts"), past, past);
    const before = record();
    expect(await published(before, found)).toEqual(before);
    for (const file of ["generated/server/main.ts", ".env.local", "ortho.config.ts", "pnpm-lock.yaml", "package.json"]) {
      const kept = readFileSync(join(root, file));
      rmSync(join(root, file));
      expect(await published(before, found), `${file} deleted`).toBeUndefined();
      writeFileSync(join(root, file), kept);
      utimesSync(join(root, file), past, past);
    }
  });

  it("does not find a world that says another nonce: a pid reused, or another world on the port", async () => {
    expect(await published(record({ nonce: "somebody else's" }), found)).toBeUndefined();
  });

  it("lets one prove at a time into the world, and takes over the lock of a process that is gone", async () => {
    const first = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const a = yield* Warm.lock(root);
      const b = yield* Warm.lock(root);
      return [a, b];
    })));
    expect(first, "the second prove at once is told no").toEqual([true, false]);
    expect(existsSync(join(root, ".ortho/warm.lock")), "released with the scope").toBe(false);
    writeFileSync(join(root, ".ortho/warm.lock"), `${2 ** 22 + 1}\n`);
    expect(await Effect.runPromise(Effect.scoped(Warm.lock(root))), "a lock left by a killed prove").toBe(true);
  });

  it("empties the collector's folder when it resets", async () => {
    const telemetry = join(root, ".ortho/dev-telemetry");
    mkdirSync(telemetry, { recursive: true });
    writeFileSync(join(telemetry, "traces.jsonl"), "{}\n");
    const before = statSync(join(telemetry, "traces.jsonl")).ino;
    // The world's door is not there to answer (the Worker's own test covers it), so the reset fails, after the folder is emptied.
    const result = await Effect.runPromise(Effect.result(Warm.reset(record({ url: "http://127.0.0.1:1" }))));
    expect(result._tag).toBe("Failure");
    expect(readFileSync(join(telemetry, "traces.jsonl"), "utf8"), "emptied").toBe("");
    expect(statSync(join(telemetry, "traces.jsonl")).ino, "a file of its own: on Linux a removed file's inode comes back, and a reader that compares them would take the new file for the old one grown").not.toBe(before);
  });
});
