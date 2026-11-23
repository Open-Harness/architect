// K40 fix 6, end to end on real programs: a real `git push` from inside a sandbox to the GitHub adapter's stand-in (a real bare repository
// behind git's smart HTTP, which refuses a push with no bearer token). The token is lent for that one call; it works, it is redacted from
// everything the bridge says or records, and the next push, with no loan, is refused again. No token is a real one: the stand-in takes any.
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { localDaemon } from "@earendil-works/pi-env";
import { Effect } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nodeDisk } from "../disk/service.ts";
import { Sandboxes } from "./service.ts";
import type { SandboxesApi } from "./types.ts";

const STAND_IN = join(dirname(fileURLToPath(import.meta.url)), "../../../../../examples/superagent/plugins/github/src/stand-in/main.ts");
const TOKEN = "ghs_lent_for_one_hour_canary";
let base = "";
let github: ChildProcess;
let origin = "";
let api: SandboxesApi;
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

beforeAll(async () => {
  base = realpathSync(mkdtempSync(join(tmpdir(), "ortho-sbx-lend-")));
  github = spawn(process.execPath, [STAND_IN, "--port", "0", "--dir", join(base, "github")], { stdio: ["ignore", "pipe", "ignore"] });
  origin = await new Promise<string>((resolve) => github.stdout?.on("data", (c: Buffer) => { const m = /listening on (http:\/\/\S+)/.exec(c.toString("utf8")); if (m?.[1] !== undefined) resolve(m[1]); }));
  let n = 0;
  api = await run(Sandboxes.make({ dir: join(base, "bridge"), limit: 2, daemon: localDaemon(), systemPath: process.env["PATH"] ?? "/usr/bin:/bin", disk: nodeDisk, ids: { id: () => `sbx_${++n}`, token: () => `t${n}` }, now: () => 1_000 }).pipe(Effect.provide(TimersLive)));
});
afterAll(async () => {
  await run(api.sweep);
  github.kill("SIGTERM");
  await new Promise((done) => github.once("exit", done));
  rmSync(base, { recursive: true, force: true });
});

describe("lend, with a real git push", () => {
  it("pushes with a lent token, redacted everywhere, and the next push without it is refused", { timeout: 60_000 }, async () => {
    const { sandbox } = await run(api.open({ owner: "coder", tag: "ticket/one", variables: [], blocked: [] }));
    const git = (script: string, lend: boolean) => run(api.exec({
      sandbox, command: ["sh", "-c", `export GIT_TERMINAL_PROMPT=0 GIT_CONFIG_NOSYSTEM=1; ${script}`], timeoutSeconds: 50,
      ...(lend ? { lend: [{ name: "GH_TOKEN", value: TOKEN, scope: "acme/widgets contents:write pull_requests:write", expiresAt: 1_000 + 3_600_000 }] } : {}),
    }));
    const clone = await git(`git clone -q ${origin}/acme/widgets.git work && cd work && echo change > change.txt && git add . && git -c user.name=Bot -c user.email=bot@example.test commit -q -m change`, false);
    expect(clone).toMatchObject({ exit: 0 });

    // With a loan the header carries it; with none there is no header at all (the stand-in, like GitHub, refuses an unauthenticated push).
    const push = `cd work; if [ -n "$GH_TOKEN" ]; then set -- -c "http.extraHeader=Authorization: Bearer $GH_TOKEN"; fi; git "$@" push origin HEAD:refs/heads/fix-flaky-login 2>&1; echo "header was Bearer $GH_TOKEN"`;
    const without = await git(push, false);
    expect(without.stdout).toMatch(/401|Authentication|denied|fatal/i);
    expect(without.stdout).not.toMatch(/fix-flaky-login\s+->|new branch/);

    const lent = await git(push, true);
    expect(lent.stdout).toMatch(/new branch|fix-flaky-login/);
    expect(lent.stdout).toContain("header was Bearer [redacted:GH_TOKEN]");
    expect(lent.stdout + lent.stderr).not.toContain(TOKEN);

    const [seen] = await run(api.seen({ sandbox }));
    expect(seen?.execs.map((e) => e.lent)).toEqual([[], [], ["GH_TOKEN"]]);
    expect(seen?.loans).toEqual([{ name: "GH_TOKEN", scope: "acme/widgets contents:write pull_requests:write", expiresAt: 3_601_000 }]);
    expect(JSON.stringify(seen)).not.toContain(TOKEN);

    const again = await git(push.replace("fix-flaky-login", "another"), false);
    expect(again.stdout).not.toMatch(/new branch/);
    expect(again.stdout).toMatch(/401|Authentication|denied|fatal/i);
    expect((await run(api.close(sandbox))).closed).toBe(true);
  });
});
