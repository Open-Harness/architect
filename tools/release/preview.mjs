#!/usr/bin/env node
// M1.51, the npm preview's dry run (K28). Repo tooling, plain Node ESM: packages never import it.
//   node tools/release/preview.mjs --dry-run [--root <dir>] [--registry <url>] [--tag <tag>]
// Lists every public package under <root>/packages/* (no `"private": true`) with its version, tag, licence and the files
// `pnpm pack` would send (the tarball a `pnpm publish` makes: `workspace:` links and `bin` rewritten, the preset's `prepack` run),
// then judges the licence (Aaron, 23 November 2026: "Make it all Apache 2.0"), what pnpm cannot or did not put right
// (a `workspace:` link that survives, a `bin` outside the tarball, a preset with no starter; slice 5, #1063) and, against npmjs,
// the tag (`next` only). In a workspace with an `nx.json` it first BUILDS the public packages (the lead's call, slice 5), so the
// tarballs hold `dist`. It reads the disk, builds and packs into a scratch folder; it never publishes, never reads a token and
// never opens a connection: the registry is only an address it compares the tag against. A real publish is Aaron's.
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const NPMJS = "https://registry.npmjs.org/";
const USAGE = "usage: node tools/release/preview.mjs --dry-run [--root <dir>] [--registry <url>] [--tag <tag>]";
const LICENSE = "Apache-2.0";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** `--flag value`, `--flag=value` and bare `--dry-run`; anything else is a usage error. */
const parse = (argv) => {
  const out = { dryRun: false, root: process.cwd(), registry: NPMJS, tag: undefined };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s);
    if (flag === "--dry-run") { out.dryRun = true; continue; }
    if (!["--root", "--registry", "--tag"].includes(flag)) return undefined;
    const value = inline ?? argv[++i];
    if (value === undefined) return undefined;
    out[flag.slice(2)] = value;
  }
  return out;
};

/** Whether an address is npmjs, however it is spelled (no scheme, case, port, path, one trailing dot). An address that cannot be parsed counts as npmjs: the guard fails closed. */
const isNpmjs = (address) => {
  const spelled = /^[a-z][a-z0-9+.-]*:\/\//i.test(address) ? address : `https://${address}`;
  try { return new URL(spelled).hostname.toLowerCase().replace(/\.$/, "") === "registry.npmjs.org"; } catch { return true; }
};

const manifests = (root) => {
  const base = join(root, "packages");
  if (!existsSync(base)) return [];
  return readdirSync(base).sort()
    .map((name) => join(base, name))
    .filter((dir) => existsSync(join(dir, "package.json")))
    .map((dir) => ({ dir, ...JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) }))
    .filter((m) => m.private !== true)
    .sort((a, b) => a.name.localeCompare(b.name));
};

const FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const STARTER = ["files/blueprint/", "files/src/", "files/journeys/", "files/generated/model/model.json"];

const failure = (e) => String(e.stderr || e.stdout || e.message).split("\n").find((l) => l.trim() !== "") ?? "failed";

/** Build the public packages of a workspace that has an `nx.json`, so the tarballs hold `dist`. Returns a refusal line, or nothing. */
const built = async (root, list) => {
  if (!existsSync(join(root, "nx.json"))) return [];
  const projects = list.filter((m) => existsSync(join(m.dir, "project.json"))).map((m) => basename(m.dir));
  try {
    await run("pnpm", ["nx", "run-many", "-t", "build", "-p", projects.join(","), "--outputStyle=static"], { cwd: root, env: { ...process.env, NX_DAEMON: "false", NX_NO_CLOUD: "true" }, maxBuffer: 256 * 1024 * 1024 });
    return [];
  } catch (e) { return [`refused: the build of the public packages failed: ${failure(e)}`]; }
};

/** What `pnpm pack` makes of a package: the files and size of its tarball and the manifest inside it. When pnpm refuses, the files are what npm would list and `error` says why. */
const packed = async (m, scratch) => {
  const out = mkdtempSync(join(scratch, "pack-"));
  try {
    await run("pnpm", ["pack", "--pack-destination", out], { cwd: m.dir, maxBuffer: 64 * 1024 * 1024 });
    const tgz = join(out, readdirSync(out).find((f) => f.endsWith(".tgz")));
    const [listed, manifest] = await Promise.all([run("tar", ["-tzf", tgz], { maxBuffer: 64 * 1024 * 1024 }), run("tar", ["-xOzf", tgz, "package/package.json"])]);
    const files = listed.stdout.split("\n").filter((f) => f !== "" && !f.endsWith("/")).map((f) => f.replace(/^package\//, "")).sort();
    return { files, size: statSync(tgz).size, manifest: JSON.parse(manifest.stdout) };
  } catch (e) {
    const { dir: _dir, ...disk } = m;
    const manifest = { ...disk, ...(m.publishConfig?.bin === undefined ? {} : { bin: m.publishConfig.bin }) };
    try {
      const { stdout } = await run("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: m.dir, maxBuffer: 64 * 1024 * 1024 });
      const [info] = JSON.parse(stdout);
      return { files: info.files.map((f) => f.path).sort(), size: info.size, manifest, error: failure(e) };
    } catch { return { files: [], size: 0, manifest, error: failure(e) }; }
  }
};

const bytes = (n) => (n < 1000 ? `${n} B` : n < 1e6 ? `${(n / 1e3).toFixed(1)} kB` : `${(n / 1e6).toFixed(1)} MB`);
const shown = (license) => (license === undefined || license === null ? "none" : typeof license === "string" ? (license === "" ? '""' : license) : JSON.stringify(license));

const block = (m, tag, p) => [
  `${m.name}@${m.version}  tag ${tag}  license ${shown(m.license)}  (${p.files.length} ${p.files.length === 1 ? "file" : "files"}, ${bytes(p.size)})`,
  ...p.files.map((f) => `  ${f}`),
].join("\n");

/** One refusal line per public package whose licence is not exactly Apache-2.0. */
const licenceRefusals = (list) => list.flatMap((m) => {
  if (m.license === LICENSE) return [];
  if (m.license === undefined || m.license === null || m.license === "") return [`refused: ${m.name} has no license`];
  return [`refused: ${m.name} license is ${JSON.stringify(m.license)}, not ${LICENSE}`];
});

/** A `workspace:` link pnpm did not rewrite: one line per link, naming the package and the dependency. When pnpm could not pack at all and no link explains it, its own words. */
const linkRefusals = (m, p) => {
  const links = FIELDS.flatMap((field) => Object.entries(p.manifest[field] ?? {}).filter(([, spec]) => String(spec).startsWith("workspace:")).map(([dep, spec]) => ({ field, dep, spec })));
  if (links.length > 0) return links.map(({ field, dep, spec }) => `refused: ${m.name} keeps the link ${dep}@${spec} in ${field}: pnpm cannot resolve it to a version`);
  return p.error === undefined ? [] : [`refused: ${m.name} could not be packed by pnpm: ${p.error}`];
};

/** One line per `bin` of the manifest as published whose file is not in the tarball. */
const binRefusals = (m, p) => {
  const bin = p.manifest.bin;
  const entries = typeof bin === "string" ? [[m.name, bin]] : Object.entries(bin ?? {});
  return entries.filter(([, file]) => !p.files.includes(posix.normalize(file))).map(([name, file]) => `refused: ${m.name} bin ${name} names ${file}, which is not in the tarball`);
};

/** The preset carries the starter: its blueprint, handlers, journeys and compiled model, in the tarball and not only on the disk. */
const starterRefusals = (m, p) => {
  if (m.name !== "@orthograph/preset") return [];
  const missing = STARTER.filter((part) => !p.files.some((f) => f === part || (part.endsWith("/") && f.startsWith(part))));
  return missing.length === 0 ? [] : [`refused: ${m.name} has no starter in its tarball: ${missing.join(", ")} missing`];
};

const rootLicenceRefusal = () => {
  const file = join(repoRoot, "LICENSE");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  const ok = /Apache License\s+Version 2\.0, January 2004/.test(text) && text.includes("END OF TERMS AND CONDITIONS");
  return ok ? [] : [`refused: the root LICENSE is missing or is not the Apache License 2.0 (${file})`];
};

const main = async () => {
  const args = parse(process.argv.slice(2));
  if (args === undefined || !args.dryRun) { console.error(USAGE); return 2; }
  const tag = args.tag ?? "next";
  if (isNpmjs(args.registry) && tag !== "next") {
    console.error(`refused: tag "${tag}" is not allowed on ${args.registry}: the preview goes out under "next" only`);
    return 1;
  }
  const root = resolve(args.root);
  const list = manifests(root);
  const buildRefusal = await built(root, list);
  if (buildRefusal.length > 0) { buildRefusal.forEach((line) => console.error(line)); return 1; }
  const scratch = mkdtempSync(join(tmpdir(), "ortho-preview-"));
  try {
    const sent = await Promise.all(list.map((m) => packed(m, scratch)));
    list.forEach((m, i) => console.log(block(m, tag, sent[i])));
    const refusals = [...licenceRefusals(list), ...list.flatMap((m, i) => [...linkRefusals(m, sent[i]), ...binRefusals(m, sent[i]), ...starterRefusals(m, sent[i])]), ...rootLicenceRefusal()];
    refusals.forEach((line) => console.error(line));
    console.log(`${list.length} packages, tag ${tag}, registry ${args.registry}: dry run, nothing sent`);
    return refusals.length === 0 ? 0 : 1;
  } finally { rmSync(scratch, { recursive: true, force: true }); }
};

process.exitCode = await main();
