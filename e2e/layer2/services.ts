// The services around Gate 2's environments, each a process of @orthograph/services that the stack starts and stops (K10 section 8,
// M1.33: no Docker): the local OIDC issuer (D3 #8), Verdaccio (D3 #9) and the logbook and environments through ortho itself.
import { generateKeyPairSync, createSign } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Effect, Exit, Scope } from "effect";
import { Issuer, Registry, type IssuerConfig } from "@orthograph/services";
import { expect } from "vitest";
import { type Ports, nothingRunning, ports, repo, run, sleep } from "./support.ts";

/** The claims a CI job would carry for `ortho-logbook`, per scenario (D3 #8). */
const scenarios: IssuerConfig = {
  tokenCallbacks: [{
    issuerId: "ortho",
    tokenExpiry: 600,
    requestMappings: [{
      requestParam: "client_id",
      match: "ci-main",
      claims: { sub: "repo:acme/acme:ref:refs/heads/main", aud: ["ortho-logbook"], repository: "acme/acme", ref: "refs/heads/main", workflow: "ortho" },
    }],
  }],
};

export const trusted = { repository: "acme/acme", ref: "refs/heads/main", workflow: "ortho" };

/** A token the issuer mints for a scenario (client credentials; the server does not check the secret). */
export const mintToken = async (issuer: string, client = "ci-main") => {
  const response = await fetch(`${issuer}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }),
  });
  expect(response.status).toBe(200);
  return ((await response.json()) as { access_token: string }).access_token;
};

/** The same token, claims and key id intact, with a signature from a key of the forger's own. */
export const forge = (token: string) => {
  const [header, payload] = token.split(".");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
};

export type Stack = {
  readonly ports: Ports;
  /** The environment variables a command needs: issuer, trusted claims, and the registry when there is one. */
  readonly env: Readonly<Record<string, string>>;
  readonly issuer: string;
  readonly rogue: string | undefined;
  readonly registry: string | undefined;
  readonly logbook: string;
  /** The URL of an environment started by `up`. */
  readonly url: (environment: "test" | "staging" | "production") => string;
  readonly up: (environment: "test" | "staging" | "production", extra?: Readonly<Record<string, string>>) => void;
  readonly down: (environment: "test" | "staging" | "production") => void;
  /** Stop everything this stack started and remove what it made; the problems it met, empty when all went clean. */
  readonly stop: () => Promise<ReadonlyArray<string>>;
};

/** The local OIDC issuer, the logbook (`ortho env up logbook`) and, if asked, a rogue second issuer and Verdaccio. */
export const startStack = async (root: string, check: number, options: { readonly registry?: boolean; readonly rogue?: boolean; readonly env?: Readonly<Record<string, string>> } = {}): Promise<Stack> => {
  const p = ports();
  const dir = mkdtempSync(join(tmpdir(), "ortho-gate2-"));
  // Each service is a process of this scope: closing it stops them, in reverse, and a leaked one is the teardown's to find.
  const services = Effect.runSync(Scope.make());
  const running = new Set<string>();
  const problems: Array<string> = [];
  const stop = async () => {
    for (const name of [...running].reverse()) {
      const down = run(root, env, "env", "down", name);
      if (down.status !== 0) problems.push(`env down ${name}: ${down.out.slice(-500)}`);
    }
    running.clear();
    await Effect.runPromise(Scope.close(services, Exit.void));
    rmSync(dir, { recursive: true, force: true });
    return problems;
  };
  const env: Record<string, string> = {};
  try {
    const start = <A, E>(effect: Effect.Effect<A, E, Scope.Scope>) => Effect.runPromise(effect.pipe(Scope.provide(services)));
    const issuing = (name: string, port: number) => {
      const at = join(dir, name);
      mkdirSync(at);
      return start(Issuer.start({ port, dir: at, config: scenarios })).then((issued) => issued.url);
    };
    const issuer = await issuing("issuer", p.issuer);
    const rogue = options.rogue ? await issuing("rogue", p.rogue) : undefined;
    const registry = options.registry ? await start(Registry.start({ dir, port: p.registry })) : undefined;
    Object.assign(env, {
      ORTHO_OIDC_ISSUER: issuer, ORTHO_OIDC_CLIENT: "ci-main",
      ORTHO_OIDC_REPOSITORY: trusted.repository, ORTHO_OIDC_REF: trusted.ref, ORTHO_OIDC_WORKFLOW: trusted.workflow,
      HOMEBREW_NO_AUTO_UPDATE: "1", HOMEBREW_NO_ANALYTICS: "1", ...options.env,
      ...(registry ? { ORTHO_REGISTRY: registry.url, NPM_CONFIG_USERCONFIG: registry.npmrc } : {}),
    });
    const up = (name: string, port: number, extra: Readonly<Record<string, string>> = {}) => {
      const said = run(root, { ...env, ...extra }, "env", "up", name, "--port", String(port));
      running.add(name);
      expect(said.status, said.out.slice(-2000)).toBe(0);
      expect(said.lines, said.out).toContain(`${name} up http://127.0.0.1:${port}`);
    };
    up("logbook", p.logbook);
    return {
      ports: p, env, issuer, rogue, registry: registry?.url, logbook: `http://127.0.0.1:${p.logbook}`,
      url: (environment) => `http://127.0.0.1:${p[environment]}`,
      up: (environment, extra) => up(environment, p[environment], extra),
      down: (environment) => {
        const said = run(root, env, "env", "down", environment);
        expect(said.status, said.out).toBe(0);
      },
      stop,
    };
  } catch (error) {
    await stop();
    throw error;
  }
};

/** What an afterAll does for a check: stop the stack, then see that nothing of this copy still runs. */
export const finish = async (root: string, stack: Stack | undefined) => {
  const problems = (await stack?.stop()) ?? [];
  await sleep(500);
  nothingRunning(root);
  expect(problems).toEqual([]);
};

const orthographPackages = ["orthograph", "compiler", "language-effect", "lint", "generators", "host-cloudflare", "logbook", "prove", "cli", "preset"] as const;

/**
 * Every `@orthograph/*` package, built and published to the stack's registry as tools/e2e/starter.sh does, so that what promote
 * publishes (`@acme/sdk`) resolves all its dependencies locally. The throwaway user's token stays in the temp npmrc; nothing prints it.
 */
export const publishOrthograph = (stack: Stack) => {
  const registry = stack.registry;
  const npmrc = stack.env["NPM_CONFIG_USERCONFIG"];
  if (registry === undefined || npmrc === undefined) throw new Error("the stack has no registry");
  const built = spawnSync("pnpm", ["nx", "run-many", "-t", "build", "--outputStyle=static"], { cwd: repo, encoding: "utf8", env: { ...process.env, NX_DAEMON: "false" }, timeout: 900_000 });
  expect(built.status, built.stdout.slice(-2000) + built.stderr.slice(-2000)).toBe(0);
  for (const name of orthographPackages) {
    const published = spawnSync("pnpm", ["publish", "--registry", registry, "--no-git-checks"], {
      cwd: join(repo, "packages", name), encoding: "utf8", env: { ...process.env, NPM_CONFIG_USERCONFIG: npmrc }, timeout: 300_000 });
    expect(published.status, `${name}: ${published.stderr.slice(-1500)}`).toBe(0);
  }
};
