// The staging workflow's two uses of the account, as one command (M7.04). Written by the checks author; a builder never edits it.
//
//   node e2e/staging/leftovers.mjs snapshot <out.json>
//     Lists the account's Workers, D1 databases, Durable Object namespaces and R2 buckets, whole, and writes the listing. It only reads. It takes the token and the account id from
//     CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, prints neither, and writes neither into the listing. A kind that cannot be read is written as an error, never as an empty list.
//   node e2e/staging/leftovers.mjs judge --prefix <p> --after <f> [--before <f>] [--during <f> --plan <f>]
//     Judges listings already written; no network, no credential. `--after` must hold nothing with the prefix; with `--before` nothing without it changed; with `--during` and `--plan`
//     `up` made exactly what the plan said. Exit 0 every judgement holds, 1 one fails, 2 a listing cannot be read.
//   node e2e/staging/leftovers.mjs filter <prefix> <from-dir> <to-dir>
//     The evidence that may be published. Reads `during.json` and `after.json` in <from-dir> (the account's whole listings, which are never uploaded: the account holds other apps' resource
//     names and the repository is public) and writes `during-run.json` and `after-run.json` in <to-dir>, each cut to the names the prefix owns. A file that is not there is skipped; a bad
//     prefix writes nothing and exits 2.
//
// `ORTHO_STAGING_API` points `snapshot` at another address, and only a loopback one (the check's own tests serve a fake account from this machine); the real account is the default.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CLEAN, FAILED, UNREADABLE, leftovers, made, ownedOnly, untouched, worst } from "./listing.mjs";

const LOOPBACK = /^http:\/\/(127\.\d+\.\d+\.\d+|localhost|\[::1\]):\d+$/;

const apiOf = (env) => {
  const token = env.CLOUDFLARE_API_TOKEN, account = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) return { problem: "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must both be set: this runs only inside the staging workflow" };
  const given = env.ORTHO_STAGING_API;
  if (given !== undefined && !LOOPBACK.test(given)) return { problem: "ORTHO_STAGING_API is for a server on this machine only" };
  return { base: `${given ?? "https://api.cloudflare.com"}/client/v4/accounts/${account}`, headers: { authorization: `Bearer ${token}` } };
};

/**
 * One kind, every page. Workers and D1 are paged by number; R2 is paged by cursor (Cloudflare's List Buckets: `result_info.cursor`, sent back as `cursor`), and a request without it repeats the
 * first page, so R2 follows the cursor until none comes. A page that adds nothing new ends a numbered listing, so an endpoint that ignores `page` cannot loop; a cursor that does not move is an
 * error, never a short list.
 */
const list = async (api, label, path, nameOf, cursored = false) => {
  const names = new Set();
  let cursor;
  for (let page = 1; page < 500; page++) {
    const paging = cursored ? `per_page=100${cursor === undefined ? "" : `&cursor=${encodeURIComponent(cursor)}`}` : `page=${page}&per_page=100`;
    const res = await fetch(`${api.base}${path}${path.includes("?") ? "&" : "?"}${paging}`, { headers: api.headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) return { label, error: `HTTP ${res.status} ${JSON.stringify((body.errors ?? []).map((e) => ({ code: e.code, message: e.message })))}` };
    const found = Array.isArray(body.result) ? body.result : (body.result?.buckets ?? []);
    const before = names.size;
    for (const row of found) names.add(nameOf(row));
    if (cursored) {
      const next = body.result_info?.cursor;
      if (typeof next !== "string" || next === "" || found.length === 0) break;
      if (next === cursor) return { label, error: "the cursor did not move: the listing is incomplete" };
      cursor = next;
      continue;
    }
    if (found.length < 100 || names.size === before) break;
  }
  return { label, names: [...names] };
};

export const snapshot = async (env) => {
  const api = apiOf(env);
  if (api.problem) return { problem: api.problem };
  return {
    listing: [
      await list(api, "workers", "/workers/scripts", (r) => r.id),
      await list(api, "d1", "/d1/database", (r) => r.name),
      await list(api, "durable-object-namespaces", "/workers/durable_objects/namespaces", (r) => `${r.script}:${r.class}:${r.name}`),
      await list(api, "r2", "/r2/buckets", (r) => r.name, true),
    ],
  };
};

const flags = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith("--") || argv[i + 1] === undefined) return { problem: `usage: judge --prefix <p> --after <f> [--before <f>] [--during <f> --plan <f>] (got ${argv[i]})` };
    out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
};
const json = (path) => { try { return JSON.parse(readFileSync(path, "utf8")); } catch { return undefined; } };

export const judge = (argv) => {
  const given = flags(argv);
  if (given.problem) return { exit: UNREADABLE, lines: [given.problem] };
  if (given.prefix === undefined || given.after === undefined) return { exit: UNREADABLE, lines: ["--prefix and --after are required"] };
  if ((given.during === undefined) !== (given.plan === undefined)) return { exit: UNREADABLE, lines: ["--during and --plan go together"] };
  const files = Object.fromEntries(["after", "before", "during", "plan"].filter((k) => given[k] !== undefined).map((k) => [k, json(given[k])]));
  const missing = Object.keys(files).filter((k) => files[k] === undefined);
  if (missing.length > 0) return { exit: UNREADABLE, lines: missing.map((k) => `UNREADABLE ${k}: ${given[k]} is missing or not JSON`) };
  const verdicts = [
    { name: "nothing of the run's is left", ...leftovers(files.after, given.prefix) },
    ...(files.before === undefined ? [] : [{ name: "nothing without the prefix changed", ...untouched(files.before, files.after, given.prefix) }]),
    ...(files.during === undefined ? [] : [{ name: "up made what the plan said", ...made(files.plan, files.during, given.prefix) }]),
  ];
  return { exit: worst(verdicts), lines: verdicts.flatMap((v) => [`== ${v.name}`, ...v.lines.map((l) => `   ${l}`)]) };
};

/** The run's own part of each listing in `from`, written to `to`. Returns the files it wrote. */
export const filter = (prefix, from, to) => {
  const wrote = [];
  for (const name of ["during", "after"]) {
    if (!existsSync(join(from, `${name}.json`))) continue;
    const kept = ownedOnly(json(join(from, `${name}.json`)), prefix);
    if (kept === undefined) return { exit: UNREADABLE, wrote: [] };
    writeFileSync(join(to, `${name}-run.json`), JSON.stringify(kept, null, 2));
    wrote.push(`${name}-run.json`);
  }
  return { exit: CLEAN, wrote };
};

/** The command: the only place here that reads the process, prints or exits. */
const main = async () => {
  const [verb, ...rest] = process.argv.slice(2);
  if (verb === "snapshot" && rest.length === 1) {
    const done = await snapshot(process.env);
    if (done.problem) { console.error(done.problem); process.exit(UNREADABLE); }
    writeFileSync(rest[0], JSON.stringify(done.listing, null, 2));
    for (const r of done.listing) console.log(`${r.label}: ${r.error ? `ERROR ${r.error}` : `${r.names.length} in the account`}`);
    process.exit(done.listing.some((r) => r.error) ? UNREADABLE : CLEAN);
  }
  if (verb === "filter" && rest.length === 3) {
    const done = filter(rest[0], rest[1], rest[2]);
    console.log(done.exit === CLEAN ? `the run's own listings: ${done.wrote.join(", ") || "none"}` : "cannot cut the listings: the prefix is not a run's or a listing is not readable");
    process.exit(done.exit);
  }
  if (verb === "judge") {
    const done = judge(rest);
    console.log(done.lines.join("\n"));
    console.log(done.exit === CLEAN ? "STAGING CLEAN" : done.exit === FAILED ? "STAGING FAILED" : "STAGING UNREADABLE");
    process.exit(done.exit);
  }
  console.error("usage: leftovers.mjs snapshot <out.json> | filter <prefix> <from-dir> <to-dir> | judge --prefix <p> --after <f> [--before <f>] [--during <f> --plan <f>]");
  process.exit(UNREADABLE);
};
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
