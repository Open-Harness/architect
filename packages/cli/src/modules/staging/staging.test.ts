// `ortho env up|destroy staging` against a pretend account, in this process: what the real verbs do with the plan, with no cloud, no Alchemy process and no credential. Check 37 (e2e/m1) runs the printed plan through the real command.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeStaging, prefixOf, proveAddress, stagingUrl } from "./service.ts";
import { StagingFailed, type Account, type Credentials, type Options, type Plan, type Tools } from "./types.ts";

const example = resolve(import.meta.dirname, "../../../../../examples/plugged-in");
const scratch = join(example, "tmp/cli-staging");
const root = join(scratch, "plugged-in");
const credentials = { token: "token-for-the-test", account: "account-for-the-test" };
const options = (run: string | undefined, creds: Options["credentials"] = credentials): Options => ({ root, environment: "staging", run, credentials: creds });

beforeAll(() => {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const path of ["ortho.config.ts", "blueprint", "generated", "package.json"]) cpSync(join(example, path), join(root, path), { recursive: true });
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

interface Pretend { readonly tools: Tools; readonly calls: string[]; readonly workers: Set<string>; readonly databases: Map<string, string>; readonly seen: Array<{ args: ReadonlyArray<string>; cwd: string; env: Readonly<Record<string, string>> }> }
type Alchemy = (verb: string, tries: number) => { status: number; output: string };
/** A pretend account holding `workers` and `databases` (name to id); every call is noted. Alchemy "deploys" by making what the stack's input says (as the generated stack does) and keeping state under its cwd, and "destroys" by removing it. */
const pretend = (workers: ReadonlyArray<string> = [], databases: ReadonlyArray<string> = [], alchemy: Alchemy = () => ({ status: 0, output: "" })): Pretend => {
  const calls: string[] = [];
  const seen: Pretend["seen"] = [];
  const held = new Set(workers);
  const dbs = new Map(databases.map((n, i) => [n, `id-${i}`]));
  const account = (_c: Credentials): Account => ({
    workers: Effect.sync(() => [...held]),
    databases: Effect.sync(() => [...dbs].map(([name, id]) => ({ name, id }))),
    deleteWorker: (name) => Effect.sync(() => { calls.push(`delete worker ${name}`); held.delete(name); }),
    deleteDatabase: (id) => Effect.sync(() => { calls.push(`delete database ${id}`); for (const [n, i] of dbs) if (i === id) dbs.delete(n); }),
    subdomain: Effect.succeed("acct"),
  });
  const attempts = new Map<string, number>();
  const tools: Tools = {
    account,
    alchemy: ({ args, cwd, env }) => Effect.sync(() => {
      const verb = String(args[0]);
      attempts.set(verb, (attempts.get(verb) ?? 0) + 1);
      calls.push(`alchemy ${verb}`);
      seen.push({ args, cwd, env });
      const done = alchemy(verb, attempts.get(verb) ?? 1);
      if (done.status !== 0) return done;
      const input = JSON.parse(readFileSync(String(env["ORTHO_STAGING_INPUT"]), "utf8")) as { plan: Plan };
      if (verb === "deploy") {
        mkdirSync(join(cwd, ".alchemy/state"), { recursive: true });
        for (const r of input.plan.resources) { if (r.kind === "worker") held.add(String(r.name)); if (r.kind === "d1") dbs.set(String(r.name), `made-${dbs.size}`); }
      } else {
        rmSync(join(cwd, ".alchemy"), { recursive: true, force: true });
        for (const r of input.plan.resources) { if (r.kind === "worker") held.delete(String(r.name)); if (r.kind === "d1") dbs.delete(String(r.name)); }
      }
      return done;
    }),
    probe: () => Effect.succeed(200),
    pause: (ms) => Effect.sync(() => { calls.push(`pause ${ms}`); }),
    secret: () => "not-a-real-secret",
    build: () => Effect.succeed({ main: "/built/main.js", revision: "abc1234", sha256: "f".repeat(64) }),
  };
  return { tools, calls, workers: held, databases: dbs, seen };
};
const run = <A>(e: Effect.Effect<A>) => Effect.runPromise(e);

describe("staging up and destroy", () => {
  it("the prefix and the address come from one place", () => {
    expect(prefixOf("plugged-in", "7")).toBe("ortho-pluggedin-stg-7");
    expect(stagingUrl("ortho-pluggedin-stg-7", "acct")).toBe("https://ortho-pluggedin-stg-7-worker.acct.workers.dev");
  });

  it("the prove address: a run and a subdomain, or the loopback override, and a refusal otherwise", async () => {
    const at = (run: string | undefined, subdomain: string | undefined, origin?: string) => Effect.runPromise(Effect.flip(proveAddress({ root: "/nowhere", run, subdomain, origin })).pipe(Effect.map((e) => e.message)));
    expect(await at(undefined, "acme")).toMatch(/--run/);
    expect(await at("R1", "acme")).toMatch(/--run/);
    expect(await at("r1", undefined)).toMatch(/ORTHO_STAGING_SUBDOMAIN/);
    expect(await at("r1", "a.b")).toMatch(/ORTHO_STAGING_SUBDOMAIN/);
    expect(await at("r1", "acme", "http://example.com")).toMatch(/ORTHO_STAGING_ORIGIN/);
    expect(await Effect.runPromise(proveAddress({ root, run: "r1", subdomain: undefined, origin: "http://127.0.0.1:8787/" }))).toMatchObject({ url: "http://127.0.0.1:8787", label: "run r1", prefix: "ortho-pluggedin-stg-r1" });
  });

  it("destroy deletes what the run's prefix owns, matched at a dash, and nothing else", async () => {
    const mine = "ortho-pluggedin-stg-1";
    const world = pretend(
      [`${mine}-worker`, "ortho-pluggedin-stg-12-worker", `${mine}x-worker`, "someone-elses", `ortho-acme-stg-1-worker`],
      [`${mine}-db`, "ortho-pluggedin-stg-12-db", "other-db", `${mine}-db-ledger`],
    );
    const said = await run(makeStaging(world.tools).destroy(options("1")));
    expect(said.exit).toBe(0);
    expect([...world.workers].sort()).toEqual(["ortho-acme-stg-1-worker", "ortho-pluggedin-stg-12-worker", "someone-elses", `${mine}x-worker`].sort());
    expect([...world.databases.keys()].sort()).toEqual(["ortho-pluggedin-stg-12-db", "other-db"]);
    // Workers first: a database a Worker binds is not deleted while it is bound.
    expect(world.calls.findIndex((c) => c.startsWith("delete worker"))).toBeLessThan(world.calls.findIndex((c) => c.startsWith("delete database")));
    expect(said.out).not.toContain("someone-elses");
  });

  it("destroy of a run nothing was made for deletes nothing and says so", async () => {
    const world = pretend(["other"], ["other-db"]);
    const said = await run(makeStaging(world.tools).destroy(options("9")));
    expect(said.exit).toBe(0);
    expect(world.calls).toEqual([]);
  });

  it("destroy with no Alchemy state at all, as in another job than the `up`, still deletes this run's Worker and databases, and only those", async () => {
    const mine = "ortho-pluggedin-stg-3";
    rmSync(join(root, ".ortho"), { recursive: true, force: true });
    const world = pretend(
      [`${mine}-worker`, "ortho-pluggedin-stg-33-worker", "ortho-pluggedin-stg-4-worker", "unrelated"],
      [`${mine}-db`, `${mine}-db-ledger`, "ortho-pluggedin-stg-33-db", "ortho-pluggedin-stg-4-db", "unrelated-db"],
    );
    const said = await run(makeStaging(world.tools).destroy(options("3")));
    expect(said.exit, said.err).toBe(0);
    expect(world.calls.filter((c) => c.startsWith("alchemy"))).toEqual([]);
    expect(said.out).toContain("alchemy no state");
    expect([...world.workers].sort()).toEqual(["ortho-pluggedin-stg-33-worker", "ortho-pluggedin-stg-4-worker", "unrelated"]);
    expect([...world.databases.keys()].sort()).toEqual(["ortho-pluggedin-stg-33-db", "ortho-pluggedin-stg-4-db", "unrelated-db"]);
  });

  it("destroy with the run's Alchemy state has Alchemy destroy first and then sweeps, so a leftover Alchemy did not know is deleted too", async () => {
    const world = pretend();
    expect((await run(makeStaging(world.tools).up(options("6")))).exit).toBe(0);
    // A leftover of the same run that Alchemy never tracked, and another run's.
    world.workers.add("ortho-pluggedin-stg-6-worker-extra"); world.workers.add("ortho-pluggedin-stg-66-worker");
    const said = await run(makeStaging(world.tools).destroy(options("6")));
    expect(said.exit, said.err).toBe(0);
    expect(said.out).toContain("alchemy destroyed");
    const after = world.calls.slice(world.calls.indexOf("alchemy destroy"));
    expect(after[0]).toBe("alchemy destroy");
    expect(after.slice(1).length).toBeGreaterThan(0);
    expect(after.slice(1).every((c) => c.startsWith("delete"))).toBe(true);
    expect(after.slice(1)).toEqual(["delete worker ortho-pluggedin-stg-6-worker-extra"]);
    expect([...world.workers]).toEqual(["ortho-pluggedin-stg-66-worker"]);
    expect([...world.databases.keys()]).toEqual([]);
  });

  it("an Alchemy destroy that fails does not stop the sweep, and says so with no credential in it", async () => {
    const world = pretend([], [], (verb) => (verb === "destroy" ? { status: 1, output: `broke on ${credentials.token}` } : { status: 0, output: "" }));
    expect((await run(makeStaging(world.tools).up(options("8")))).exit).toBe(0);
    const said = await run(makeStaging(world.tools).destroy(options("8")));
    expect(said.exit, said.err).toBe(0);
    expect(said.out).toContain("alchemy failed: broke on [token]");
    expect(said.out).not.toContain(credentials.token);
    expect(world.workers.size).toBe(0);
    expect(world.databases.size).toBe(0);
  });

  it("one failed Worker delete does not stop the databases from being deleted: the sweep tries every delete, then exits 1 with the failures together", async () => {
    const mine = "ortho-pluggedin-stg-2";
    const world = pretend([`${mine}-worker`, `${mine}-worker-b`], [`${mine}-db`, `${mine}-db-ledger`]);
    const tools: Tools = {
      ...world.tools,
      account: (c) => ({ ...world.tools.account(c), deleteWorker: (name) => (name.endsWith("-b") ? Effect.fail(new StagingFailed({ message: `refused for ${credentials.token}` })) : world.tools.account(c).deleteWorker(name)) }),
    };
    const said = await run(makeStaging(tools).destroy(options("2")));
    expect(said.exit).toBe(1);
    expect(said.err).toContain("1 deletes failed");
    expect(said.err).toContain("refused for [token]");
    expect(said.err).not.toContain(credentials.token);
    expect(world.calls.filter((c) => c.startsWith("delete database"))).toHaveLength(2);
    expect(world.databases.size).toBe(0);
    expect([...world.workers]).toEqual([`${mine}-worker-b`]);
  });

  it.each(["up", "destroy"] as const)("%s with no token or no account id exits 2 naming what is missing, and never touches the cloud", async (verb) => {
    const world = pretend();
    const touched: string[] = [];
    const tools = { ...world.tools, account: () => { touched.push("account"); return world.tools.account(credentials); } };
    for (const [creds, named] of [[{ token: undefined, account: "a" }, "CLOUDFLARE_API_TOKEN"], [{ token: "t", account: undefined }, "CLOUDFLARE_ACCOUNT_ID"], [{ token: "", account: "" }, "CLOUDFLARE_API_TOKEN"]] as const) {
      const said = await run(makeStaging(tools)[verb](options("5", creds)));
      expect(said.exit).toBe(2);
      expect(said.err).toContain(named);
    }
    expect(touched).toEqual([]);
    expect(world.calls).toEqual([]);
  });

  it("a bad run id is refused before the cloud is asked anything", async () => {
    const world = pretend();
    for (const bad of [undefined, "", "Run1", "1-2", "x".repeat(21)]) {
      const said = await run(makeStaging(world.tools).destroy(options(bad)));
      expect(said.exit, String(bad)).toBe(2);
      expect(said.err).toMatch(/--run/);
    }
    expect(world.calls).toEqual([]);
  });

  it("up has Alchemy deploy the generated stack at the run's stage, with the plan's names in its input and the secret in the environment, and says the address", async () => {
    const world = pretend();
    const said = await run(makeStaging(world.tools).up(options("77")));
    expect(said.err).toBe("");
    expect(said.exit).toBe(0);
    expect(said.out).toBe("staging up https://ortho-pluggedin-stg-77-worker.acct.workers.dev\n");
    expect(world.calls).toEqual(["alchemy deploy", "pause 2000", "pause 2000"]);
    const call = world.seen[0]!;
    expect(call.args).toEqual(["deploy", join(root, "generated/infra/alchemy.run.ts"), "--stage", "ortho-pluggedin-stg-77", "--yes"]);
    expect(call.cwd).toBe(join(root, ".ortho/staging/ortho-pluggedin-stg-77"));
    expect(call.env["ORTHO_AUTH_SECRET"]).toBe("not-a-real-secret");
    expect(call.args.join(" ")).not.toContain("not-a-real-secret");
    // The input holds the plan, the bundle and the settings, and no credential or secret.
    const input = JSON.parse(readFileSync(call.env["ORTHO_STAGING_INPUT"]!, "utf8")) as Record<string, any>;
    expect(input["plan"]).toMatchObject({ prefix: "ortho-pluggedin-stg-77", resources: [{ kind: "worker", name: "ortho-pluggedin-stg-77-worker" }, { kind: "d1", name: "ortho-pluggedin-stg-77-db", binding: "DB" }, { kind: "durable-object-namespace", class: "World" }] });
    expect(input).toMatchObject({ main: "/built/main.js", vars: { ORTHO_ENVIRONMENT: "staging", ORTHO_REVISION: "abc1234", ORTHO_BUNDLE_SHA256: "f".repeat(64) } });
    expect(JSON.stringify(input)).not.toContain(credentials.token);
    expect(JSON.stringify(input)).not.toContain("not-a-real-secret");
  });

  it("the generated stack takes every name from the plan: its text holds none of its own", () => {
    const text = readFileSync(join(example, "generated/infra/alchemy.run.ts"), "utf8");
    expect(text.split("\n")[0]).toMatch(/^\/\/ Generated from .* Do not edit\.$/);
    expect(text).not.toMatch(/ortho-|-stg-|-worker/);
  });

  it("a first deploy that fails with code 10007 is tried again after a pause, once", async () => {
    const world = pretend([], [], (verb, tries) => (verb === "deploy" && tries === 1 ? { status: 1, output: "This Worker does not exist on your account [code: 10007]" } : { status: 0, output: "" }));
    const said = await run(makeStaging(world.tools).up(options("78")));
    expect(said.exit, said.err).toBe(0);
    expect(world.calls.filter((c) => c === "alchemy deploy")).toHaveLength(2);
    expect(world.calls).toContain("pause 20000");
  });

  it("a deploy that fails any other way fails up (exit 1), with Alchemy's words cut to 300 characters and no credential", async () => {
    const world = pretend([], [], (verb) => (verb === "deploy" ? { status: 1, output: `boom for ${credentials.token} in ${credentials.account} ${"x".repeat(900)}` } : { status: 0, output: "" }));
    const said = await run(makeStaging(world.tools).up(options("79")));
    expect(said.exit).toBe(1);
    expect(said.err).toContain("the deploy failed");
    expect(said.err).not.toContain(credentials.token);
    expect(said.err).not.toContain(credentials.account);
    expect(said.err.length).toBeLessThan(340);
  });

  it("a deploy failure never holds the Worker's random secret either", async () => {
    const world = pretend([], [], (verb) => (verb === "deploy" ? { status: 1, output: `rejected secret not-a-real-secret for ${credentials.token}` } : { status: 0, output: "" }));
    const said = await run(makeStaging(world.tools).up(options("83")));
    expect(said.exit).toBe(1);
    expect(said.err).toContain("[secret]");
    expect(said.err).not.toContain("not-a-real-secret");
    expect(said.err).not.toContain(credentials.token);
  });

  it("a relative --root (the workflow passes examples/plugged-in) still gives Alchemy an absolute stack, input and working folder", async () => {
    const world = pretend();
    const said = await run(makeStaging(world.tools).up({ ...options("81"), root: relative(process.cwd(), root) }));
    expect(said.exit, said.err).toBe(0);
    const call = world.seen[0]!;
    for (const p of [String(call.args[1]), call.cwd, call.env["ORTHO_STAGING_INPUT"]!]) { expect(isAbsolute(p), p).toBe(true); expect(existsSync(p), p).toBe(true); }
  });

  it("a generated config that binds something the plan does not cover (R2) is refused before anything is deployed", async () => {
    const path = join(root, "generated/server/wrangler.jsonc");
    const before = readFileSync(path, "utf8");
    writeFileSync(path, before.replace('"vars"', '"r2_buckets": [{ "binding": "B", "bucket_name": "b" }],\n  "vars"'));
    const world = pretend();
    const said = await run(makeStaging(world.tools).up(options("82")));
    writeFileSync(path, before);
    expect(said.exit).toBe(1);
    expect(said.err).toContain("r2_buckets");
    expect(world.calls.filter((c) => c.startsWith("alchemy"))).toEqual([]);
  });
});

describe("the Alchemy CLI the real tools start", () => {
  it("is a file that exists, the one in Alchemy's own package", async () => {
    const { alchemyBin } = await import("./internal/alchemy-bin.ts");
    expect(existsSync(alchemyBin)).toBe(true);
    expect(alchemyBin.endsWith("/alchemy/bin/cli.js")).toBe(true);
  });

  it("keeps the line that names a missing module, and still hides the credentials", async () => {
    const { clip } = await import("./internal/stack.ts");
    const trace = ["Error: Cannot find module '/x/token-for-the-test/missing.js'", ...Array.from({ length: 10 }, (_, i) => `    at frame ${i}`), "Node.js v24"].join("\n");
    const said = clip(trace, credentials);
    expect(said).toContain("Cannot find module");
    expect(said).toContain("missing.js");
    expect(said).not.toContain("token-for-the-test");
    expect(said).toContain("[token]");
  });
});
