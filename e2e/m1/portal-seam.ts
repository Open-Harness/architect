// The instruments of check 15 (M1.34): a mirror root to lint in, a scanner for Pro's code in a packed dist, and a reader for
// the fork rule in a workflow. They are judged by the controls of the check, so a verdict never rests on an unproved tool.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import { repo } from "./support.ts";

export const PRO = "@heroui-pro";
export const SECRET = /secrets\.HEROUI_AUTH_TOKEN/i;

/** Walks a folder (not `node_modules`) and returns relative path -> text for the files `keep` accepts. */
export const textFiles = (root: string, keep: (path: string) => boolean = () => true): Record<string, string> => {
  const found: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDirectory()) { if (entry.name !== "node_modules") walk(path); } else if (keep(path)) found[path] = readFileSync(join(root, path), "utf8");
    }
  };
  if (existsSync(root)) walk("");
  return found;
};

// ---- lint: a mirror of the repository's layout, with the repository's own `.oxlintrc.json` ----

export interface Linted { readonly status: number | null; readonly out: string }

/** Plants files in a mirror (config copied, plugin and node_modules linked, `packages/portal` copied) and lints `targets`. */
export const lintMirror = (planted: Record<string, string>, targets: ReadonlyArray<string>): Linted => {
  const mirror = mkdtempSync(join(tmpdir(), "ortho-seam-"));
  try {
    cpSync(join(repo, ".oxlintrc.json"), join(mirror, ".oxlintrc.json"));
    symlinkSync(join(repo, "node_modules"), join(mirror, "node_modules"));
    mkdirSync(join(mirror, "packages"));
    symlinkSync(join(repo, "packages/lint"), join(mirror, "packages/lint"));
    cpSync(join(repo, "packages/portal/src"), join(mirror, "packages/portal/src"), { recursive: true });
    for (const [path, source] of Object.entries(planted)) {
      mkdirSync(dirname(join(mirror, path)), { recursive: true });
      writeFileSync(join(mirror, path), source);
    }
    const run = spawnSync(join(repo, "node_modules/.bin/oxlint"), ["-c", ".oxlintrc.json", ...targets], { cwd: mirror, encoding: "utf8" });
    // The nx boundary rule needs a project graph a mirror has not got; its warning is noise, not a finding.
    const out = `${run.stdout}${run.stderr}`.replace(/warning No cached ProjectGraph[\s\S]*?@nx\/enforce-module-boundaries\n?/g, "");
    return { status: run.status, out };
  } finally { rmSync(mirror, { recursive: true, force: true }); }
};

export const bans = (linted: Linted) => linted.status !== 0 && /no-restricted-imports/.test(linted.out) && linted.out.includes(PRO);

// ---- the packed dist holds nothing of Pro ----

const importSite = /(?:from\s*|import\s*\(?\s*|require\s*\(\s*)["'`]$/;

/** A manifest without Pro's name as a key of `peerDependencies`, `peerDependenciesMeta` or `devDependencies`: that is the seam's
 * own declaration. Pro anywhere else in it (`dependencies`, `bundleDependencies`, `files`, `exports`, `scripts`) stays. */
const withoutPeerNames = (text: string): string => {
  try {
    const manifest = JSON.parse(text) as Record<string, unknown>;
    for (const field of ["peerDependencies", "peerDependenciesMeta", "devDependencies"]) {
      const entries = manifest[field];
      if (entries !== null && typeof entries === "object") {
        manifest[field] = Object.fromEntries(Object.entries(entries).filter(([name]) => !name.startsWith("@heroui-pro/")));
      }
    }
    return JSON.stringify(manifest, null, 1);
  } catch { return text; }
};

/** What in these files (path -> text) is Pro's code or a trace of it bundled in. An external import of Pro is not. */
export const proInside = (files: Record<string, string>): ReadonlyArray<string> => {
  const found: Array<string> = [];
  for (const [path, original] of Object.entries(files)) {
    const text = path === "package.json" || path.endsWith("/package.json") ? withoutPeerNames(original) : original;
    if (/heroui-pro/i.test(path)) found.push(`${path}: a file or folder named for Pro`);
    if (/node_modules\/(?:\.pnpm\/)?@heroui-pro/.test(text)) found.push(`${path}: a path into Pro's install`);
    if (/@license[^*]*heroui|Copyright[^\n]*(?:heroui|nextui)/i.test(text)) found.push(`${path}: Pro's licence banner`);
    if (path.endsWith(".map")) continue;
    for (const hit of text.matchAll(/@heroui-pro\/[^"'`\s)]*/g)) {
      if (!importSite.test(text.slice(Math.max(0, hit.index - 16), hit.index))) found.push(`${path}: a mention of ${hit[0]} that is not an import`);
    }
  }
  return found;
};

/** Lines of Pro's own JavaScript (100+ characters) that appear verbatim in `files`: copied code, whatever it is called. */
export const copiedFrom = (proDir: string, files: Record<string, string>): ReadonlyArray<string> => {
  const lines = new Set<string>();
  for (const text of Object.values(textFiles(proDir, (p) => /\.(?:m|c)?js$/.test(p)))) {
    for (const line of text.split("\n")) if (line.trim().length >= 100) lines.add(line.trim());
  }
  const hits: Array<string> = [];
  for (const [path, text] of Object.entries(files)) if (!path.endsWith(".map") && [...lines].some((line) => text.includes(line))) hits.push(`${path}: a line of Pro's own code`);
  return hits;
};

// ---- a workflow, and what a fork's pull request would run ----

type Value = string | boolean | null | undefined;
export const contexts = {
  fork: { event_name: "pull_request", repository: "owner/repo", head: "someone/fork", isFork: true, draft: "false" },
  sameRepo: { event_name: "pull_request", repository: "owner/repo", head: "owner/repo", isFork: false, draft: "false" },
  push: { event_name: "push", repository: "owner/repo", head: undefined, isFork: undefined, draft: "false" },
} as const;
/** `draft` is what the `ready` job outputs (`needs.ready.outputs.draft`): "false" on a push, and on a live, non-draft pull request.
 * The check judges a live run; a draft run starts no job but `ready`, so it reads no secret. */
export type Context = { readonly event_name: string; readonly repository: string; readonly head: string | undefined; readonly isFork: boolean | undefined; readonly draft: string };

/** Evaluates a GitHub `if` (==, !=, &&, ||, !, parentheses, strings, contexts, always() and success()); anything else throws. */
export const evaluate = (source: unknown, ctx: Context): boolean => {
  if (source === undefined) return true;
  if (typeof source === "boolean") return source;
  if (typeof source !== "string") throw new Error(`cannot read the condition: ${String(source)}`);
  const text = source.trim().replace(/^\$\{\{([\s\S]*)\}\}$/, "$1");
  const tokens = text.match(/'(?:[^']|'')*'|&&|\|\||==|!=|[()!]|[A-Za-z_][\w.-]*(?:\(\))?/g) ?? [];
  if (tokens.join("").length < text.replace(/\s/g, "").length) throw new Error(`cannot read the condition: ${source}`);
  let at = 0;
  const lookup = (name: string): Value => ({
    "github.event_name": ctx.event_name, "github.repository": ctx.repository,
    "github.event.pull_request.head.repo.full_name": ctx.head, "github.event.pull_request.head.repo.fork": ctx.isFork,
    "needs.ready.outputs.draft": ctx.draft,
  } as Record<string, Value>)[name];
  const truthy = (value: Value) => !(value === undefined || value === null || value === false || value === "");
  const primary = (): Value => {
    const token = tokens[at++] ?? "";
    if (token === "(") { const inner = or(); at++; return inner; }
    if (token === "!") return !truthy(primary());
    if (token.startsWith("'")) return token.slice(1, -1).replace(/''/g, "'");
    if (token === "true") return true;
    if (token === "false") return false;
    if (token === "null") return null;
    if (token === "always()" || token === "success()") return true;
    if (token.endsWith("()")) throw new Error(`cannot judge ${token} in: ${source}`);
    return lookup(token);
  };
  const equal = (): Value => {
    let left = primary();
    while (tokens[at] === "==" || tokens[at] === "!=") { const same = tokens[at++] === "=="; const right = primary(); left = same === (String(left ?? "") === String(right ?? "")); }
    return left;
  };
  const and = (): Value => { let left = equal(); while (tokens[at] === "&&") { at++; const right = equal(); left = truthy(left) ? right : left; } return left; };
  const or = (): Value => { let left = and(); while (tokens[at] === "||") { at++; const right = and(); left = truthy(left) ? left : right; } return left; };
  return truthy(or());
};

export interface Reference { readonly where: string; readonly guard: ReadonlyArray<unknown>; readonly run: boolean }
export interface Reading { readonly references: ReadonlyArray<Reference>; readonly triggers: ReadonlyArray<string>; readonly workflowWide: boolean; readonly jobs: Record<string, Record<string, unknown>> }

const asRecord = (value: unknown): Record<string, unknown> => (value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {});
const triggersOf = (on: unknown): ReadonlyArray<string> => (typeof on === "string" ? [on] : Array.isArray(on) ? on.map(String) : Object.keys(asRecord(on)));

/** Every place a workflow reads the Pro token, with the `if`s above it. */
export const read = (yamlText: string): Reading => {
  const doc = asRecord(parse(yamlText));
  const jobs = asRecord(doc.jobs) as Record<string, Record<string, unknown>>;
  const references: Array<Reference> = [];
  for (const [name, job] of Object.entries(jobs)) {
    const { steps, if: jobIf, ...rest } = asRecord(job);
    if (SECRET.test(JSON.stringify(rest)) || rest.secrets === "inherit") references.push({ where: `job ${name}`, guard: [jobIf], run: false });
    (Array.isArray(steps) ? steps : []).forEach((step, index) => {
      const { if: stepIf, run, ...other } = asRecord(step);
      if (SECRET.test(JSON.stringify(other))) references.push({ where: `job ${name}, step ${index + 1}`, guard: [jobIf, stepIf], run: false });
      if (typeof run === "string" && SECRET.test(run)) references.push({ where: `job ${name}, step ${index + 1}`, guard: [jobIf, stepIf], run: true });
    });
  }
  const { jobs: _jobs, on, ...wide } = doc;
  return { references, triggers: triggersOf(on ?? (doc as Record<string, unknown>)["true"]), workflowWide: SECRET.test(JSON.stringify(wide)), jobs };
};

/** What is wrong with how a workflow reads the Pro token (empty: nothing). */
export const unsafe = (reading: Reading): ReadonlyArray<string> => {
  const problems: Array<string> = [];
  if (reading.workflowWide) problems.push("the token is read at the workflow's top level, so every job gets it");
  const forkEvents = ["pull_request", "pull_request_target"].filter((event) => reading.triggers.includes(event));
  for (const reference of reading.references) {
    if (reference.run) problems.push(`${reference.where} writes the token into a run script`);
    for (const event of forkEvents) {
      const ctx: Context = { ...contexts.fork, event_name: event };
      if (reference.guard.every((condition) => evaluate(condition, ctx))) problems.push(`${reference.where} reads the token on a fork's ${event}`);
    }
  }
  return problems;
};

export const runsOn = (reference: Reference, ctx: Context) => reference.guard.every((condition) => evaluate(condition, ctx));
