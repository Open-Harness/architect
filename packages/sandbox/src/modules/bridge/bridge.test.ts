// The bridge's door in-process, over the real sandboxes: what each call answers, and how a refusal is said (by its declared name).
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localDaemon } from "@earendil-works/pi-env";
import { Effect } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nodeDisk } from "../disk/service.ts";
import { Sandboxes } from "../sandboxes/service.ts";
import type { SandboxesApi } from "../sandboxes/types.ts";
import { Bridge } from "./service.ts";

let dir = "";
let sandboxes: SandboxesApi;
let n = 0;
let call: (path: string, body?: unknown, method?: string) => Promise<{ status: number; body: any }>;

beforeAll(async () => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), "ortho-sbx-bridge-")));
  sandboxes = await Effect.runPromise(Sandboxes.make({ dir, limit: 4, daemon: localDaemon(), systemPath: process.env["PATH"] ?? "/usr/bin:/bin", disk: nodeDisk, ids: { id: () => `sbx_${++n}`, token: () => `t${n}` }, now: () => 5_000 }).pipe(Effect.provide(TimersLive)));
  const bridge = Bridge.of(sandboxes);
  call = (path, body, method = "POST") => Effect.runPromise(bridge.handle({ method, path, body })) as never;
});
afterAll(async () => {
  await Effect.runPromise(sandboxes.sweep);
  rmSync(dir, { recursive: true, force: true });
});

describe("bridge", () => {
  it("answers open, exec, write, read, list and close as { ok: true, answer }", async () => {
    const opened = await call("/call/open", { owner: "coder", tag: "t/1", variables: [{ name: "REGION", value: "eu", from: "settings" }], blocked: ["sudo"] });
    expect(opened).toMatchObject({ status: 200, body: { ok: true, answer: { sandbox: "sbx_1", root: join(dir, "sandboxes/sbx_1") } } });
    expect(await call("/call/exec", { sandbox: "sbx_1", command: ["sh", "-c", "echo $REGION"] })).toMatchObject({ body: { ok: true, answer: { exit: 0, stdout: "eu\n" } } });
    expect(await call("/call/write", { sandbox: "sbx_1", path: "a/b.txt", content: "hi" })).toMatchObject({ body: { ok: true, answer: { bytes: 2 } } });
    expect(await call("/call/read", { sandbox: "sbx_1", path: "a/b.txt" })).toMatchObject({ body: { ok: true, answer: { content: "hi" } } });
    expect((await call("/call/list", { tag: "t/1" })).body.answer.sandboxes).toHaveLength(1);
    expect((await call("/call/list", { tag: "other" })).body.answer.sandboxes).toHaveLength(0);
    expect(await call("/call/close", { sandbox: "sbx_1" })).toMatchObject({ body: { ok: true, answer: { closed: true, killed: 1 } } });
  });

  it("says a refusal by its declared name and its fields, with status 200", async () => {
    const { body } = await call("/call/open", { owner: "coder", tag: "t/2", variables: [], blocked: ["sudo"] });
    const sandbox = body.answer.sandbox;
    expect(await call("/call/write", { sandbox, path: "../../outside.txt", content: "x" })).toMatchObject({ status: 200, body: { ok: false, error: { name: "OutsideSandbox", path: "../../outside.txt" } } });
    expect(await call("/call/exec", { sandbox, command: ["sudo", "ls"] })).toMatchObject({ status: 200, body: { ok: false, error: { name: "BlockedCommand", command: "sudo" } } });
    expect(await call("/call/exec", { sandbox, command: ["echo"], lend: [{ name: "GH_TOKEN", value: "v", scope: "s", expiresAt: 5_000 }] })).toMatchObject({ body: { ok: false, error: { name: "LoanExpired", variable: "GH_TOKEN" } } });
    expect(await call("/call/open", { owner: "coder", tag: "t/3", variables: [{ name: "GH_TOKEN", value: "v" }], blocked: [] })).toMatchObject({ body: { ok: false, error: { name: "CredentialLikeVariable" } } });
    await call("/call/close", { sandbox });
    expect(await call("/call/exec", { sandbox, command: ["pwd"] })).toMatchObject({ body: { ok: false, error: { name: "SandboxGone", sandbox } } });
  });

  it("reads what a check needs at /_stand/seen and /_stand/left, and resets at /_stand/reset", async () => {
    const { body } = await call("/call/open", { owner: "coder", tag: "t/4", variables: [], blocked: [] });
    const seen = await call("/_stand/seen", { sandbox: body.answer.sandbox });
    expect(seen.body.answer.sandboxes).toHaveLength(1);
    expect(seen.body.answer.sandboxes[0]).toMatchObject({ owner: "coder", tag: "t/4", state: "open", refusals: [], execs: [] });
    expect((await call("/_stand/left")).body.answer.folders).toHaveLength(1);
    expect(await call("/_stand/reset")).toMatchObject({ body: { ok: true } });
    expect((await call("/_stand/left")).body.answer).toEqual({ folders: [], processes: [] });
    expect(await call("/_stand/health", undefined, "GET")).toEqual({ status: 200, body: { ok: true, service: "sandbox" } });
  });

  it("refuses a request that does not decode as 400 BadRequest, an unknown call likewise, and an unknown route as 404", async () => {
    for (const [path, body, what] of [["/call/open", {}, "owner must be text"], ["/call/exec", { sandbox: "s", command: [] }, "command must be a list of text with at least 1"], ["/call/exec", { sandbox: "s", command: ["a"], timeoutSeconds: -1 }, "timeoutSeconds must be a positive number"], ["/call/write", "text", "the body is not a JSON object"], ["/call/nope", {}, "no such call: /call/nope"]] as const) {
      expect(await call(path, body), path).toEqual({ status: 400, body: { ok: false, error: { name: "BadRequest", what } } });
    }
    expect((await call("/elsewhere")).status).toBe(404);
    expect((await call("/call/open", undefined, "GET")).status).toBe(404);
  });
});
