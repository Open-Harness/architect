// What M7's checks share: where things are, and the real processes the verdict check starts (an OIDC issuer, the logbook worker on workerd). Nothing here touches a cloud, a credential or GitHub.
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { dirname, join, resolve } from "node:path";
import { freePorts } from "../ports.ts";

export const repo = resolve(import.meta.dirname, "../..");
export const cli = join(repo, "packages/cli/src/main.ts");
export { freePorts };

/** What a started process is called by `stop`: by its pid, never by name, so another run's processes are never touched. */
export const stop = (child: ChildProcess) => new Promise<void>((done) => {
  if (child.exitCode !== null || child.pid === undefined) return done();
  child.once("exit", () => done());
  child.kill("SIGTERM");
  setTimeout(() => { if (child.exitCode === null) child.kill("SIGKILL"); }, 10_000).unref();
});

export const until = async (what: string, ready: () => Promise<boolean>, ms = 120_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await ready().catch(() => false)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${what} did not answer within ${ms / 1000} s`);
};

export interface IssuerScenario { readonly issuerId: string; readonly tokenExpiry?: number; readonly clients: Readonly<Record<string, Readonly<Record<string, unknown>>>> }

/** The OIDC issuer of `@orthograph/services`, as the process it is (`node main.ts issuer --port --config`), with one client per token a check wants. `iss` is the address it was asked at. */
export const startIssuer = async (dir: string, port: number, scenarios: ReadonlyArray<IssuerScenario>): Promise<ChildProcess> => {
  mkdirSync(dir, { recursive: true });
  const config = join(dir, `issuer-${port}.json`);
  writeFileSync(config, JSON.stringify({ tokenCallbacks: scenarios.map((s) => ({ issuerId: s.issuerId, ...(s.tokenExpiry === undefined ? {} : { tokenExpiry: s.tokenExpiry }),
    requestMappings: Object.entries(s.clients).map(([match, claims]) => ({ requestParam: "client_id", match, claims })) })) }));
  const log = openSync(join(dir, `issuer-${port}.log`), "a");
  const child = spawn(process.execPath, [join(repo, "packages/services/src/main.ts"), "issuer", "--port", String(port), "--config", config], { stdio: ["ignore", log, log] });
  await until(`the issuer on ${port}`, async () => (await fetch(`http://127.0.0.1:${port}/${scenarios[0]!.issuerId}/.well-known/openid-configuration`)).ok, 30_000);
  return child;
};

/** A token for `client`, asked of the issuer at `url`; `host` says which address the issuer is asked at (its `iss` is that address, so a second issuer can be asked as if it were the first). */
export const mint = (url: string, client: string, host?: string): Promise<string> => new Promise((done, fail) => {
  const target = new URL(`${url}/token`);
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }).toString();
  const req = request({ host: target.hostname, port: target.port, path: target.pathname, method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "content-length": Buffer.byteLength(body), ...(host === undefined ? {} : { host }), connection: "close" } }, (res) => {
    let text = "";
    res.setEncoding("utf8").on("data", (c: string) => { text += c; }).on("end", () => {
      try { done((JSON.parse(text) as { access_token: string }).access_token); } catch { fail(new Error(`the issuer answered ${res.statusCode}`)); }
    });
  });
  req.on("error", fail).end(body);
});

const wrangler = join(repo, "packages/logbook/node_modules/wrangler/bin/wrangler.js");
export interface Policy { readonly issuer: string; readonly jwksUrl: string; readonly audience: string; readonly repository: string; readonly refs: ReadonlyArray<string>; readonly workflows: ReadonlyArray<string> }

/** The logbook worker as `wrangler dev` runs it, its token policy passed as variables the way the deployed worker's are (none is a secret). */
export const startLogbook = async (state: string, port: number, policy: Policy): Promise<ChildProcess> => {
  mkdirSync(state, { recursive: true });
  const vars = { OIDC_ISSUER: policy.issuer, OIDC_JWKS_URL: policy.jwksUrl, OIDC_AUDIENCE: policy.audience, ALLOWED_REPOSITORY: policy.repository, ALLOWED_REFS: policy.refs.join(","), ALLOWED_WORKFLOWS: policy.workflows.join(",") };
  const log = openSync(join(state, "wrangler.log"), "a");
  const child = spawn(process.execPath, [wrangler, "dev", "--config", join(repo, "packages/logbook/wrangler.jsonc"), "--port", String(port), "--ip", "127.0.0.1", "--persist-to", state, "--inspector-port", "0",
    ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])], { stdio: ["ignore", log, log], env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });
  await until(`the logbook on ${port}`, async () => (await fetch(`http://127.0.0.1:${port}/health`)).ok);
  return child;
};

export const exists = (path: string) => existsSync(join(repo, path)) && dirname(path) !== "";
