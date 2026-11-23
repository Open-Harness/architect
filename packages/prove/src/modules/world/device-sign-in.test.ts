// L2.07 (D3 #10): the generated CLI signs in by device code against a real local world. Ada claims and approves the code
// with her own session and no browser; then `session show` prints her. Bob can't approve what ada claimed.
import { acmeCopy } from "../../../test/acme.ts";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Schedule } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Worlds } from "./service.ts";

const project = acmeCopy();
const acme = project.root;
afterAll(project.remove);
const cli = join(acme, "generated/cli/src/main.ts");
const GRANT = "urn:ietf:params:oauth:grant-type:device_code";

type Cast = Record<string, { person: string; token: string; email: string; password: string }>;

const send = (url: string, method: string, body?: unknown, token?: string) =>
  Effect.promise(() => fetch(url, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).then(async (r) => ({ status: r.status, body: (await r.json().catch(() => ({}))) as Record<string, unknown> })));

/** `acme session sign-in --env staging`, left running with its output collected, and killed with the scope. */
const signIn = (env: NodeJS.ProcessEnv) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const child = spawn(process.execPath, [cli, "session", "sign-in", "--env", "staging"], { env, stdio: ["ignore", "pipe", "pipe"] });
      const run = { child, seen: "", code: undefined as number | null | undefined };
      child.stdout.on("data", (c: Buffer) => { run.seen += c.toString(); });
      child.stderr.on("data", (c: Buffer) => { run.seen += c.toString(); });
      child.once("exit", (code) => { run.code = code; });
      return run;
    }),
    ({ child }) => Effect.sync(() => void child.kill("SIGKILL")),
  );

const until = <A>(what: string, look: () => A | undefined) =>
  Effect.suspend(() => { const found = look(); return found === undefined ? Effect.fail(what) : Effect.succeed(found); }).pipe(
    Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 200 }),
    Effect.mapError((e) => new Error(`timed out waiting for ${e}`)),
  );

describe("device sign-in", () => {
  it("signs the generated CLI in as ada, who approves with her own session; bob's approval is a 403; session show prints ada", { timeout: 120_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { url } = yield* Worlds.start({ root: acme, port: 0, name: "device-test" });
      const cast = (yield* send(`${url}/_world/cast`, "POST", { names: ["ada", "bob"] })).body as unknown as Cast;
      const [ada, bob] = [cast["ada"]!, cast["bob"]!];
      const config = mkdtempSync(join(tmpdir(), "ortho-device-"));
      yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(config, { recursive: true, force: true })));
      const env: NodeJS.ProcessEnv = { ...process.env, ACME_URL: url, ACME_CONFIG_DIR: config };
      delete env["ACME_TOKEN"];

      // The server refuses any client but acme-cli, and a code can't be had without one.
      expect((yield* send(`${url}/api/auth/device/code`, "POST", { client_id: "some-other-cli" })).status).toBe(400);

      const run = yield* signIn(env);
      const user = yield* until("the code and where to approve it", () => (/^code (\S+)$/m.test(run.seen) && /^approve at \S+$/m.test(run.seen) ? /^code (\S+)$/m.exec(run.seen)![1] : undefined));
      expect(run.seen).toMatch(new RegExp(`^approve at ${url}/device\\?user_code=${user}$`, "m"));

      // Ada claims the code with her session, so it is hers; bob approving it is refused; ada approving it is not.
      expect((yield* send(`${url}/api/auth/device?user_code=${user}`, "GET", undefined, ada.token)).status).toBe(200);
      expect((yield* send(`${url}/api/auth/device/approve`, "POST", { userCode: user }, bob.token)).status).toBe(403);
      expect(run.code, "bob's refused approval signs nothing in").toBeUndefined();
      expect((yield* send(`${url}/api/auth/device/approve`, "POST", { userCode: user }, ada.token)).status).toBe(200);

      yield* until("the CLI to exit", () => run.code);
      expect(run.code, run.seen).toBe(0);
      expect(run.seen).toMatch(/^signed in$/m);
      expect(run.seen, "no token or password is printed").not.toContain(ada.token);
      expect(run.seen).not.toContain(ada.password);
      const stored = readFileSync(join(config, "session.json"), "utf8");
      expect(JSON.parse(stored)).toMatchObject({ staging: { url } });

      const shown = spawnSync(process.execPath, [cli, "session", "show", "--env", "staging", "--json"], { encoding: "utf8", env });
      // The device flow makes an ordinary session until M2.06 marks its row `device`, so it says `session`.
      expect([shown.status, JSON.parse(shown.stdout)]).toEqual([0, { person: ada.person, email: ada.email, via: "session" }]);
      const plain = spawnSync(process.execPath, [cli, "session", "show", "--env", "staging"], { encoding: "utf8", env });
      expect(plain.stdout, "the token is never printed").not.toContain(ada.token);

      // Never signed in to this environment: a refusal naming it, exit 1.
      const never = spawnSync(process.execPath, [cli, "session", "show", "--env", "production"], { encoding: "utf8", env });
      expect([never.status, never.stderr.trim()]).toEqual([1, 'NotSignedIn: {"env":"production"}']);
    }))));

  it("answers a poll sooner than its interval with slow_down, and a used code only once", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { url } = yield* Worlds.start({ root: acme, port: 0, name: "device-polling" });
      const cast = (yield* send(`${url}/_world/cast`, "POST", { names: ["ada"] })).body as unknown as Cast;
      const ada = cast["ada"]!;
      const started = (yield* send(`${url}/api/auth/device/code`, "POST", { client_id: "acme-cli" })).body;
      expect(started["interval"]).toBe(5);
      const poll = send(`${url}/api/auth/device/token`, "POST", { grant_type: GRANT, device_code: started["device_code"], client_id: "acme-cli" });
      expect((yield* poll).body["error"]).toBe("authorization_pending");
      expect((yield* poll).body["error"]).toBe("slow_down");
      yield* send(`${url}/api/auth/device?user_code=${String(started["user_code"])}`, "GET", undefined, ada.token);
      yield* send(`${url}/api/auth/device/approve`, "POST", { userCode: started["user_code"] }, ada.token);
      // The wait keeps to the server's interval; a poll after it gets the token, which is ada's session.
      yield* Effect.void.pipe(Effect.repeat({ schedule: Schedule.spaced("6 seconds"), times: 1 }));
      const issued = yield* poll;
      expect(issued.status).toBe(200);
      const me = yield* send(`${url}/session/show`, "POST", {}, String(issued.body["access_token"]));
      expect(me.body["person"]).toBe(ada.person);
      expect((yield* poll).status, "a code is single-use").toBe(400);
    }))));
});
