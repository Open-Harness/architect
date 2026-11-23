// The client's token and the daemon's are two values: a source of tokens that gives one value twice (a test double returning a constant)
// must fail the open, leaving nothing behind, rather than quietly hand the daemon's `ps`-visible token to clients.
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localDaemon } from "@earendil-works/pi-env";
import { Effect } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nodeDisk } from "../disk/service.ts";
import { Sandboxes } from "./service.ts";

let dir = "";
beforeAll(() => { dir = realpathSync(mkdtempSync(join(tmpdir(), "ortho-sbx-tokens-"))); });
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const make = (token: () => string) =>
  Effect.runPromise(Sandboxes.make({ dir, limit: 2, daemon: localDaemon(), systemPath: process.env["PATH"] ?? "/usr/bin:/bin", disk: nodeDisk, ids: { id: () => "sbx_one", token }, now: () => 0 }).pipe(Effect.provide(TimersLive)));

describe("the two tokens", () => {
  it("an open whose client token equals the daemon token fails by name and leaves no folder and no daemon", async () => {
    const api = await make(() => "constant");
    const result = await Effect.runPromise(Effect.result(api.open({ owner: "coder", tag: "t", variables: [], blocked: [] })));
    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "DaemonFailed", reason: "the client token and the daemon token must differ" } });
    expect([existsSync(join(dir, "sandboxes")) ? readdirSync(join(dir, "sandboxes")) : [], existsSync(join(dir, "shims")) ? readdirSync(join(dir, "shims")) : []]).toEqual([[], []]);
    expect(await Effect.runPromise(api.left)).toEqual({ folders: [], processes: [] });
  });

  it("two different values open", async () => {
    let n = 0;
    const api = await make(() => `token-${++n}`);
    expect(await Effect.runPromise(api.open({ owner: "coder", tag: "t", variables: [], blocked: [] }))).toMatchObject({ address: expect.stringMatching(/#token-1$/) });
    await Effect.runPromise(api.sweep);
  });
});
