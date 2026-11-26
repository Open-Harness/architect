// The helpers of checks 44 and 45 (M1.51, the npm preview). Nothing here knows how the command is built: it runs the command and reads its terminal output.
//
// THE COMMAND (chosen where K28 is silent; the PR says why, and it is one line to move): `node tools/release/preview.mjs --dry-run [--root <workspace>] [--registry <url>] [--tag <tag>]`,
// run with the repository as its working directory. `--root` is a workspace whose `packages/*` are the packages (default: the working directory); `--registry` defaults to npmjs
// (`https://registry.npmjs.org/`); `--tag` defaults to `next`. The packages are the ones with no `"private": true`; `orthograph` and `@orthograph/preset` are among them.
// THE OUTPUT, one block per package, then the verdict (stdout; refusals may be on stderr):
//   @orthograph/cli@0.0.0  tag next  license MIT  (3 files, 1.2 kB)       <- name@version, the tag, the `license` field (`none` when it has none), the count and the size
//     package.json                                                            <- each file `npm pack --dry-run` would send, two spaces in, an optional `  <n> B` after it
//     dist/main.js
//   refused: @orthograph/lint has no license                                <- one per public package whose `license` is not exactly "Apache-2.0" (Aaron, 23 November 2026: "Make it all Apache 2.0"), every one named, then exit 1
//   refused: @orthograph/theme license is "MIT", not Apache-2.0              <- the same, for a licence that is there and is another one
//   refused: tag "latest" is not allowed on https://registry.npmjs.org/: ...  <- a tag other than `next` against npmjs: exit 1, no block printed
// With no `--dry-run` it prints a usage line and exits 2. It reads the disk and `npm pack --dry-run`; against npmjs it makes no connection at all (deny-network.mjs ends it if it does).
import { spawn, spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repo } from "./support.ts";

export const COMMAND = ["tools/release/preview.mjs"];
export const NPMJS = "https://registry.npmjs.org/";
export const DECOY = "npm_decoyTOKEN0000000000000000000000000";
const guard = join(import.meta.dirname, "deny-network.mjs");
const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-m1-51-"));
export const cleanup = () => rmSync(parent, { recursive: true, force: true });

/** Programs other than Node that could reach a network are stand-ins that write down they were run (`deny-network.mjs` only guards Node); `shimmed()` reads what they heard. */
const shims = join(parent, "bin");
const shimLog = join(parent, "shim.log");
mkdirSync(shims, { recursive: true });
for (const tool of ["curl", "wget", "nc", "ncat", "telnet", "ssh", "scp", "ftp", "python3", "python", "perl", "ruby", "gh"]) {
  writeFileSync(join(shims, tool), `#!/bin/sh\necho "${tool} $*" >> "${shimLog}"\nexit 97\n`);
  chmodSync(join(shims, tool), 0o755);
}
export const shimmed = (): string => existsSync(shimLog) ? readFileSync(shimLog, "utf8") : "";

/** An environment with no npm login worth the name: a decoy token for npmjs and every local registry, a home of its own, and the network guard loaded first. */
export const quiet = (): NodeJS.ProcessEnv => {
  const home = join(parent, "home");
  mkdirSync(home, { recursive: true });
  const npmrc = join(home, ".npmrc");
  writeFileSync(npmrc, `//registry.npmjs.org/:_authToken=${DECOY}\n//127.0.0.1/:_authToken=${DECOY}\n`);
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: `${shims}:${process.env["PATH"] ?? ""}`, HOME: home, NPM_TOKEN: DECOY, NODE_AUTH_TOKEN: DECOY, NODE_OPTIONS: `${process.env["NODE_OPTIONS"] ?? ""} --import ${guard}`.trim() };
  for (const key of Object.keys(env)) if (/^npm_config_/i.test(key)) delete env[key];
  return { ...env, npm_config_userconfig: npmrc, npm_config_cache: join(home, "cache"), npm_config_update_notifier: "false" };
};

export interface Ran { readonly status: number | null; readonly out: string; readonly err: string; readonly all: string }
const ranOf = (status: number | null, out: string, err: string): Ran => ({ status, out, err, all: `${out}\n${err}` });
export const preview = (args: ReadonlyArray<string>, env: NodeJS.ProcessEnv = quiet()): Ran => {
  if (!existsSync(join(repo, COMMAND[0]!))) throw new Error(`${COMMAND[0]} does not exist yet (M1.51): the npm preview's dry run`);
  const done = spawnSync(process.execPath, [...COMMAND, ...args], { cwd: repo, encoding: "utf8", env, timeout: 300_000, maxBuffer: 64 * 1024 * 1024 });
  const out = done.stdout ?? "";
  const err = done.stderr ?? (done.error ? String(done.error) : "");
  return ranOf(done.status, out, err);
};
/** The same run with the event loop free, so a registry in this process can answer (and hear) while the command runs. */
export const previewAsync = (args: ReadonlyArray<string>, env: NodeJS.ProcessEnv = quiet()): Promise<Ran> => {
  if (!existsSync(join(repo, COMMAND[0]!))) throw new Error(`${COMMAND[0]} does not exist yet (M1.51): the npm preview's dry run`);
  return new Promise((done) => {
    const child = spawn(process.execPath, [...COMMAND, ...args], { cwd: repo, env });
    let out = ""; let err = "";
    child.stdout.on("data", (d) => { out += String(d); });
    child.stderr.on("data", (d) => { err += String(d); });
    const timer = setTimeout(() => child.kill("SIGKILL"), 300_000);
    child.on("close", (status) => { clearTimeout(timer); done(ranOf(status, out, err)); });
  });
};

export interface Block { readonly name: string; readonly version: string; readonly tag: string; readonly license: string; readonly count: number; readonly files: ReadonlyArray<string>; readonly line: string }
const HEAD = /^(@[^/\s@]+\/[^@\s]+|[^@\s/][^@\s]*)@(\S+)\s+tag (\S+)\s+license (.+?)\s+\((\d+) files?, \d+(?:\.\d+)? (?:B|kB|MB)\)/;
/** The blocks a run printed, in order, with repeats kept. */
export const blocks = (text: string): ReadonlyArray<Block> => {
  const found: Array<{ -readonly [K in keyof Block]: Block[K] } & { files: string[] }> = [];
  for (const line of text.split("\n")) {
    const head = HEAD.exec(line);
    if (head) found.push({ name: head[1]!, version: head[2]!, tag: head[3]!, license: head[4]!, count: Number(head[5]), files: [], line });
    else if (found.length > 0) { const file = /^ {2}(\S+)/.exec(line); if (file) found[found.length - 1]!.files.push(file[1]!); }
  }
  return found;
};
/** The names the run refused for a licence that is missing or is not Apache-2.0, in order. */
export const unlicensed = (text: string): ReadonlyArray<string> => [...text.matchAll(/^refused: (\S+) (?:has no license|license is .+, not Apache-2\.0)\s*$/gm)].map((m) => m[1]!);

// ---- what the packages are, read from the manifests and from npm itself ----

export interface Manifest { readonly dir: string; readonly name: string; readonly version: string; readonly license?: unknown; readonly private?: boolean }
export const manifestsOf = (root: string): ReadonlyArray<Manifest> => {
  const listed = spawnSync("sh", ["-c", `for f in ${JSON.stringify(root)}/packages/*/package.json; do echo "$f"; done`], { encoding: "utf8" }).stdout.trim().split("\n");
  return listed.map((file) => ({ dir: file.replace(/\/package\.json$/, ""), ...JSON.parse(spawnSync("cat", [file], { encoding: "utf8" }).stdout) as Omit<Manifest, "dir"> })).sort((a, b) => a.name.localeCompare(b.name));
};
export const publicOf = (root: string) => manifestsOf(root).filter((m) => m.private !== true);
/** The files `npm pack --dry-run` would put in a package's tarball, sorted: npm's own answer, never the command's. */
export const packed = (dir: string): ReadonlyArray<string> => {
  const run = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: dir, encoding: "utf8", env: quiet() });
  if (run.status !== 0) throw new Error(`npm pack --dry-run failed in ${dir}: ${run.stderr.slice(0, 300)}`);
  return (JSON.parse(run.stdout) as Array<{ files: Array<{ path: string }> }>)[0]!.files.map((f) => f.path).sort();
};

// ---- a workspace written fresh: real manifests and real files on disk ----

export interface Spec { readonly dir: string; readonly name: string; readonly version: string; readonly license?: unknown; readonly private?: boolean; readonly files?: ReadonlyArray<string> }
const PLANTED: Readonly<Record<string, string>> = {
  "dist/index.js": "export {};\n", "dist/index.d.ts": "export {};\n", "src/index.ts": "export {};\n", "src/index.test.ts": "export {};\n", "test/t.ts": "export {};\n",
  "expected-failing/a.txt": "x\n", ".env": "SECRET=planted\n", "README.md": "# x\n", "generators.json": "{}\n",
  // The starter a preset carries (Goal 18 slice 5, check 47): planted everywhere, shipped only by a package whose `files` names `files`.
  "files/blueprint/app.ts": "export {};\n", "files/src/handler.ts": "export {};\n", "files/journeys/first.ts": "export {};\n", "files/generated/model/model.json": "{}\n",
};
export const workspace = (specs: ReadonlyArray<Spec>): string => {
  const root = mkdtempSync(join(parent, "ws-"));
  for (const s of specs) {
    const dir = join(root, "packages", s.dir);
    for (const [path, text] of Object.entries(PLANTED)) { mkdirSync(join(dir, path, ".."), { recursive: true }); writeFileSync(join(dir, path), text); }
    const { dir: _dir, files, ...fields } = s;
    writeFileSync(join(dir, "package.json"), JSON.stringify({ ...fields, type: "module", files: files ?? ["dist"] }, null, 2));
  }
  return root;
};
/** The four packages of a good preview: the front door, the preset, one more, and a private one with no licence. Every public one has a licence. */
export const GOOD: ReadonlyArray<Spec> = [
  { dir: "orthograph", name: "orthograph", version: "0.3.0", license: "Apache-2.0" },
  { dir: "preset", name: "@orthograph/preset", version: "0.4.0-next.1", license: "Apache-2.0", files: ["dist", "generators.json", "files"] },
  { dir: "alpha", name: "@orthograph/alpha", version: "1.2.3", license: "Apache-2.0", files: ["dist", "src/index.ts"] },
  { dir: "hidden", name: "@orthograph/hidden", version: "9.9.9", private: true },
];
export const without = (specs: ReadonlyArray<Spec>, name: string, change: Partial<Spec> | "drop-license") =>
  specs.map((s) => { if (s.name !== name) return s; if (change !== "drop-license") return { ...s, ...change }; const { license: _l, ...rest } = s; return rest; });

// ---- a registry that writes down every request it hears ----

export interface Recorder { readonly url: string; readonly heard: Array<{ method: string; url: string; authorization: string | undefined }>; readonly close: () => Promise<void> }
export const recorder = async (): Promise<Recorder> => {
  const heard: Recorder["heard"] = [];
  const server: Server = createServer((req, res) => {
    heard.push({ method: req.method ?? "?", url: req.url ?? "?", authorization: req.headers.authorization });
    req.resume();
    res.statusCode = req.method === "GET" || req.method === "HEAD" ? 404 : 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "recorded" }));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", () => done()));
  const port = (server.address() as { port: number }).port;
  return { url: `http://127.0.0.1:${port}/`, heard, close: () => new Promise<void>((done) => { server.close(() => done()); server.closeAllConnections(); }) };
};
