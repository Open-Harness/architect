#!/usr/bin/env node
// M1.51, the npm preview's dry run (K28). Repo tooling, plain Node ESM: packages never import it.
//   node tools/release/preview.mjs --dry-run [--root <dir>] [--registry <url>] [--tag <tag>]
// Lists every public package under <root>/packages/* (no `"private": true`) with its version, tag, licence and the files
// `npm pack --dry-run` would send, then judges the licence (Aaron, 23 November 2026: "Make it all Apache 2.0") and, against
// npmjs, the tag (`next` only). It reads the disk and runs `npm pack --dry-run`; it never publishes, never reads a token and
// never opens a connection: the registry is only an address it compares the tag against. A real publish is Aaron's.
import { execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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

/** What npm itself would put in the tarball. */
const packed = async (dir) => {
  const { stdout } = await run("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: dir, maxBuffer: 64 * 1024 * 1024 });
  const [info] = JSON.parse(stdout);
  return { files: info.files.map((f) => f.path).sort(), size: info.size };
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
  const list = manifests(resolve(args.root));
  const sent = await Promise.all(list.map((m) => packed(m.dir)));
  list.forEach((m, i) => console.log(block(m, tag, sent[i])));
  const refusals = [...licenceRefusals(list), ...rootLicenceRefusal()];
  refusals.forEach((line) => console.error(line));
  console.log(`${list.length} packages, tag ${tag}, registry ${args.registry}: dry run, nothing sent`);
  return refusals.length === 0 ? 0 : 1;
};

process.exitCode = await main();
