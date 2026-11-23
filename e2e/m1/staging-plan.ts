// What check 37 shares (M7.03): the plan `ortho env up staging --plan` prints, judged against the compiled model, and the project copies it is judged on.
// Nothing here names a resource of Plugged In: every expected name, count and class comes out of `generated/model/model.json`, the project's configured
// name, the environment and the run. A pure judge (`problems`), so the same function runs on the real plan and on every planted wrong one.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cli, copyOf, repo } from "../layer1/support.ts";
import { succeeds } from "./support.ts";

export const pluggedIn = join(repo, "examples/plugged-in");
/** The only environment this check plans, and the short form every resource name carries for it (`design/decisions/M7-cloud.md`, addendum: `ortho-pluggedin-stg-<run>`). */
export const ENVIRONMENT = "staging";
export const SHORT = "stg";

// ---- the plan's shape (documented in the header of check 37) ----

export type Kind = "worker" | "d1" | "durable-object-namespace" | "r2";
export interface Resource { readonly kind: Kind; readonly name?: string; readonly binding?: string; readonly script?: string; readonly class?: string }
export interface Plan { readonly app: string; readonly environment: string; readonly run: string; readonly prefix: string; readonly resources: ReadonlyArray<Resource> }

/** The model as far as a plan is derived from it: the things (where each lives), the declared stores (and their kinds). */
export interface PlanModel {
  readonly things: Readonly<Record<string, { readonly lives: string; readonly store?: string }>>;
  readonly stores?: Readonly<Record<string, { readonly name: string; readonly kind: string }>>;
}

/** `Plugged In` is configured as `plugged-in`; the prefix keeps its letters and digits only. */
export const slug = (app: string) => app.toLowerCase().replace(/[^a-z0-9]/g, "");
export const prefixOf = (app: string, run: string) => `ortho-${slug(app)}-${SHORT}-${run}`;
/** A name belongs to a run when it is the prefix or continues it past a dash: run `1` does not own run `12`'s resources. */
export const owns = (prefix: string, name: string) => name === prefix || name.startsWith(`${prefix}-`);

/** The Worker's name, the default database's, a declared database store's own, and the namespaces: what the generated `wrangler.jsonc` binds, under the run's prefix. */
export const expected = (model: PlanModel, prefix: string): ReadonlyArray<Resource> => {
  const worker = `${prefix}-worker`;
  const stores = Object.values(model.stores ?? {}).filter((s) => s.kind === "database").map((s) => s.name).sort();
  const actors = Object.values(model.things).some((t) => t.lives === "actor");
  return [
    { kind: "worker", name: worker },
    { kind: "d1", name: `${prefix}-db`, binding: "DB" },
    ...stores.map((s): Resource => ({ kind: "d1", name: `${prefix}-db-${s}`, binding: `DB_${s.toUpperCase().replace(/-/g, "_")}` })),
    { kind: "durable-object-namespace", script: worker, class: "World" },
    ...(actors ? [{ kind: "durable-object-namespace", script: worker, class: "Actor" } satisfies Resource] : []),
  ];
};

/**
 * The longest a name the plan makes may be: 63 characters. A Worker script name must be 63 characters or less while `workers.dev` is on (it becomes a DNS label in the Worker's address;
 * Cloudflare's docs, "workers.dev" page, Limitations: "Must be 63 characters or less"; 255 without it). Staging deploys to `workers.dev`, so the Worker is held to 63. Cloudflare's docs state no
 * limit for a D1 database name (checked 21 November 2026: the D1 limits page, the `d1 create` API schema and the Wrangler D1 commands page say nothing), so a database name is held to the same 63:
 * a plan that refuses early is cheaper than a deploy that fails halfway and has to destroy. The plan refuses an app or a store whose names would be longer, before it makes anything.
 */
export const MAX_NAME = 63;
/** The longest name `expected` gives for a model and a prefix. */
export const longestName = (model: PlanModel, prefix: string) => Math.max(...expected(model, prefix).map((r) => (r.name ?? r.script ?? "").length));

/** The most letters and digits an app's name may have for a run: the Worker `ortho-<app>-stg-<run>-worker` must still be MAX_NAME. */
export const maxApp = (run: string) => MAX_NAME - `ortho--${SHORT}-${run}-worker`.length;
/** The most letters a database store's name may have for an app and a run: `<prefix>-db-<store>` must still be MAX_NAME. */
export const maxStore = (app: string, run: string) => MAX_NAME - `${prefixOf(app, run)}-db-`.length;
/** `blueprint/stores/<name>.ts` with one database store and one thing living in it. */
export const storeVariant = (name: string): Variant => ({ files: { [`blueprint/stores/${name}.ts`]: STORE("database"), "blueprint/things/note/thing.ts": THING("Note", "NT", "not", "store", `import store from "../../stores/${name}.ts";`) } });

const FIELDS: Record<Kind, ReadonlyArray<string>> = {
  worker: ["kind", "name"], d1: ["kind", "name", "binding"], "durable-object-namespace": ["kind", "script", "class"], r2: ["kind", "name"],
};
const line = (r: Resource) => `${r.kind} ${r.name ?? `${r.script}:${r.class}`}${r.binding ? ` (${r.binding})` : ""}`;
const sameAs = (a: Resource, b: Resource) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** Everything wrong with `plan`: an empty list is a pass. `model`, `app` and `run` are what the plan is judged against, never read from the plan. */
export const problems = (plan: unknown, model: PlanModel, app: string, run: string): ReadonlyArray<string> => {
  const prefix = prefixOf(app, run);
  if (typeof plan !== "object" || plan === null || Array.isArray(plan)) return [`the plan is not one JSON object: ${JSON.stringify(plan)?.slice(0, 80)}`];
  const p = plan as Record<string, unknown>;
  const out: string[] = [];
  for (const [key, want] of [["app", app], ["environment", ENVIRONMENT], ["run", run], ["prefix", prefix]] as const) {
    if (p[key] !== want) out.push(`${key} is ${JSON.stringify(p[key])}, expected ${JSON.stringify(want)}`);
  }
  for (const key of Object.keys(p).filter((k) => !["app", "environment", "run", "prefix", "resources"].includes(k))) out.push(`the plan has ${key}, which a plan does not carry`);
  if (!Array.isArray(p["resources"])) return [...out, `resources is ${JSON.stringify(p["resources"])}, expected a list`];
  const got = p["resources"] as ReadonlyArray<unknown>;
  const kept: Resource[] = [];
  for (const [i, item] of got.entries()) {
    const r = item as Record<string, unknown>;
    if (typeof item !== "object" || item === null || Array.isArray(item) || !(typeof r["kind"] === "string" && Object.hasOwn(FIELDS, r["kind"]))) { out.push(`resources[${i}] is not a resource of a known kind: ${JSON.stringify(item)?.slice(0, 80)}`); continue; }
    const fields = FIELDS[r["kind"] as Kind];
    const odd = Object.keys(r).filter((k) => !fields.includes(k));
    const absent = fields.filter((k) => typeof r[k] !== "string" || r[k] === "");
    if (odd.length > 0) out.push(`resources[${i}] has ${odd.join(", ")}, which a ${r["kind"]} does not carry`);
    if (absent.length > 0) out.push(`resources[${i}] (${r["kind"]}) lacks ${absent.join(", ")}`);
    const owner = r["kind"] === "durable-object-namespace" ? r["script"] : r["name"];
    if (typeof owner === "string" && !owns(prefix, owner)) out.push(`${line(r as unknown as Resource)} is not under the run's prefix ${prefix}`);
    if (odd.length === 0 && absent.length === 0) kept.push(r as unknown as Resource);
  }
  const want = expected(model, prefix);
  for (const w of want) if (!kept.some((r) => sameAs(r, w))) out.push(`missing ${line(w)}`);
  for (const r of kept) if (!want.some((w) => sameAs(r, w))) out.push(`unexpected ${line(r)}: the model has nothing that needs it`);
  const seen = new Set<string>();
  for (const r of kept) { const key = JSON.stringify(Object.entries(r).sort()); if (seen.has(key)) out.push(`${line(r)} is planned twice`); seen.add(key); }
  const targets = new Map<string, number>();
  for (const r of kept) { const key = `${r.kind} ${r.name ?? `${r.script}:${r.class}`}`; targets.set(key, (targets.get(key) ?? 0) + 1); }
  for (const [key, n] of targets) if (n > 1 && !out.some((m) => m.endsWith("planned twice"))) out.push(`${key} is named by ${n} resources`);
  return out;
};

// ---- the project copies the plan is read from ----

/** The staging environment the check puts in a copy: the plain one examples/starter has (a Worker on Cloudflare with D1, no domain), so these checks do not wait for Plugged In's own. */
export const STAGING_ENVIRONMENT = `import { Blueprint, Cloud, Deploy, Identity } from "orthograph";

export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  deploy: { server: Deploy.worker() },
});
`;

export interface Variant {
  /** Files written into the copy, by path from its root. */
  readonly files?: Readonly<Record<string, string>>;
  /** The name `ortho.config.ts` gives the project. */
  readonly name?: string;
}
const STORE = (kind: string) => `import { Blueprint } from "orthograph";\nexport default Blueprint.store.${kind}();\n`;
const THING = (identifier: string, code: string, prefix: string, lives: string, imports = "") =>
  `import { Blueprint } from "orthograph";\n${imports}\nexport const ${identifier} = Blueprint.thing({ description: "One more.", code: "${code}", fields: { id: Blueprint.id("${prefix}") }${lives ? `, lives: ${lives}` : ""} });\n`;
/** The variants the plan is judged on: each one adds one thing to Plugged In, in a different place. */
export const VARIANTS = {
  /** A thing in the default database: the same Worker, database and namespace as before. */
  "one more thing, in the default database": { files: { "blueprint/things/note/thing.ts": THING("Note", "NT", "not", "") } },
  /** A thing in a declared database store: one more database, bound beside `DB`. */
  "one more thing, in a database store of its own": { files: { "blueprint/stores/ledger.ts": STORE("database"), "blueprint/things/note/thing.ts": THING("Note", "NT", "not", "ledger", `import ledger from "../../stores/ledger.ts";`) } },
  /** A thing that lives as an actor: the Worker gains the namespace its actors share (K3). */
  "one more thing, living as an actor": { files: { "blueprint/stores/rooms.ts": STORE("actor"), "blueprint/things/note/thing.ts": THING("Note", "NT", "not", "rooms", `import rooms from "../../stores/rooms.ts";`) } },
  /** Two actor things share the one namespace (K3: "a namespace of its own per actor store is not made"). */
  "two more things, both living as actors": { files: {
    "blueprint/stores/rooms.ts": STORE("actor"),
    "blueprint/things/note/thing.ts": THING("Note", "NT", "not", "rooms", `import rooms from "../../stores/rooms.ts";`),
    "blueprint/things/memo/thing.ts": THING("Memo", "MM", "mem", "rooms", `import rooms from "../../stores/rooms.ts";`),
  } },
  /** The project's name is read from its configuration, in one place, and the prefix follows it. */
  "another project name": { name: "acme-links" },
} as const satisfies Record<string, Variant>;

export interface Project { readonly root: string; readonly app: string; readonly remove: () => void }
const TREE_SKIP = new Set(["node_modules"]);

/** A copy of an example with no `generated/`, a variant applied, the staging environment written when `staging` is set, and the real `ortho generate` run. */
export const project = (variant: Variant = {}, options: { readonly example?: string; readonly staging?: boolean } = {}): Project => {
  const example = options.example ?? pluggedIn;
  const copy = copyOf(example, ["ortho.config.ts", "blueprint", "src", "journeys", "package.json"].filter((p) => existsSync(join(example, p))));
  const write = (path: string, text: string) => { mkdirSync(join(copy.root, path, ".."), { recursive: true }); writeFileSync(join(copy.root, path), text); };
  try {
    if (options.staging !== false) write("blueprint/environments/staging.ts", STAGING_ENVIRONMENT);
    for (const [path, text] of Object.entries(variant.files ?? {})) write(path, text);
    if (variant.name !== undefined) write("ortho.config.ts", `import { Blueprint } from "orthograph";\n\nexport default Blueprint.config({ name: "${variant.name}" });\n`);
    succeeds(copy.root, "generate");
  } catch (error) { copy.remove(); throw error; }
  const app = /name:\s*"([^"]+)"/.exec(readFileSync(join(copy.root, "ortho.config.ts"), "utf8"))?.[1] ?? "";
  return { root: copy.root, app, remove: copy.remove };
};

export const modelOf = (root: string) => JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as PlanModel & { readonly environments?: Record<string, unknown> };

// ---- running the command: no cloud, no credentials ----

/** A module Node loads first (`--import`): any connection to a host that is not this machine ends the process with a line naming it. */
const denyNetwork = join(import.meta.dirname, "deny-network.mjs");
export const DENIED = "NETWORK-DENIED";
export const quiet = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_OPTIONS: `${process.env["NODE_OPTIONS"] ?? ""} --import ${denyNetwork}`.trim() };
  // No credential reaches the command, whatever this shell holds.
  for (const key of Object.keys(env)) if (/^(CLOUDFLARE_|CF_|WRANGLER_)/.test(key)) delete env[key];
  return env;
};
export interface Ran { readonly status: number | null; readonly out: string; readonly err: string }
export const ortho = (root: string, args: ReadonlyArray<string>, env: NodeJS.ProcessEnv = quiet()): Ran => {
  const done = spawnSync(process.execPath, [cli, ...args, "--root", root], { cwd: root, encoding: "utf8", env, timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
  return { status: done.status, out: done.stdout, err: done.stderr };
};
/** `ortho env <verb> staging --plan --run <run>`. */
export const plan = (root: string, verb: "up" | "destroy", run: string | undefined, extra: ReadonlyArray<string> = []): Ran =>
  ortho(root, ["env", verb, ENVIRONMENT, "--plan", ...(run === undefined ? [] : ["--run", run]), ...extra]);
/** The first lines the command said on stderr (or stdout), on one line. */
export const says = (ran: Ran) => (ran.err.trim() || ran.out.trim()).split("\n").map((l) => l.trim()).filter((l) => l !== "").slice(0, 3).join(" | ").slice(0, 200);
/** The plan a run printed, or the reason it has none, in one line a reader can act on. */
export const planOf = (ran: Ran, what: string): unknown => {
  if (ran.status !== 0) throw new Error(`${what} exited ${ran.status}: ${says(ran)}`);
  try { return JSON.parse(ran.out); } catch { throw new Error(`${what} printed no JSON plan on stdout: ${ran.out.trim().slice(0, 120)}`); }
};

/** Every file under a project, by path, with a digest: two of these are equal when nothing was written, changed or removed (dot-folders count). */
export const snapshot = (root: string, dir = ""): Record<string, string> => Object.fromEntries(
  readdirSync(join(root, dir), { withFileTypes: true }).filter((e) => !TREE_SKIP.has(e.name)).flatMap((e) => {
    const path = dir === "" ? e.name : `${dir}/${e.name}`;
    return e.isDirectory() ? Object.entries(snapshot(root, path)) : [[path, createHash("sha256").update(readFileSync(join(root, path))).digest("hex")]];
  }),
);
