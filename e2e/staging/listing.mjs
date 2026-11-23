// The judging half of the staging check (M7.04): pure functions over account listings, no network, no credential. `leftovers.mjs` fetches a listing and calls these.
// Written by the checks author from `spikes/staging-pass/leftovers.mjs`, which only listed and judged by `includes`; a builder never edits this file (AGENTS.md, "Journeys and
// checks come first"). The rules come from `design/decisions/M7-cloud.md`, addendum: destroy touches only its own run, a listing afterwards fails the job when a resource with that
// run's prefix is left, and nothing deletes or changes a resource without it.
//
// A listing is what the spike recorded: `[{ label, names }]`, one entry for each of the four kinds below, `names` the account's whole list for that kind, or `{ label, error }` when
// the kind could not be read. A Durable Object namespace is named `<script>:<class>:<name>` (the API's own fields, joined), and it belongs to the run its script belongs to.

export const KINDS = ["workers", "d1", "durable-object-namespaces", "r2"];

/** `ortho-<app>-<environment>-<run>`: what `ortho env up staging --plan` prints as `prefix`. A shorter or emptier prefix would claim resources that are not the run's. */
export const PREFIX = /^ortho-[a-z0-9]+-[a-z]+-[a-z0-9]{1,20}$/;

/**
 * A name belongs to a run when it is the prefix or continues it past a dash: run `1` does not own run `12`'s resources. Case and surrounding space do not hide it: Cloudflare's names are
 * lower case, so a name that differs only there is read as the run's, never as someone else's (a leftover must not slip past on a technicality).
 */
export const owns = (prefix, name) => {
  if (typeof name !== "string") return false;
  const n = name.trim().toLowerCase();
  return n === prefix || n.startsWith(`${prefix}-`);
};

/** The part of a listed name that says whose it is: a namespace's script, any other kind's own name. */
const ownerOf = (label, name) => (label === "durable-object-namespaces" ? String(name).split(":")[0] : name);

/** A listing that cannot be judged says why; one that can returns `{ by }`, the names by kind. */
export const read = (listing) => {
  if (!Array.isArray(listing)) return { problems: ["the listing is not a list of kinds"] };
  const problems = [];
  const by = new Map();
  for (const entry of listing) {
    const label = entry?.label;
    if (!KINDS.includes(label)) { problems.push(`a kind nobody asked for: ${JSON.stringify(label)}`); continue; }
    if (by.has(label)) { problems.push(`${label} is listed twice`); continue; }
    const names = Array.isArray(entry.names) && entry.names.every((n) => typeof n === "string") ? entry.names : undefined;
    // Names read alongside an error are still searched: a leftover in them is a failure, not a technicality.
    if (entry.error !== undefined) problems.push(`${label} could not be read: ${entry.error}`);
    else if (names === undefined) problems.push(`${label} has no list of names`);
    by.set(label, names);
    if (names === undefined) continue;
    // PRIVACY: the verdict is uploaded from a public repository, so a problem with a name says how many, never which: the account holds other apps' resources.
    const twice = names.filter((n, i) => names.indexOf(n) !== i).length;
    if (twice > 0) problems.push(`${label} lists ${twice} name${twice === 1 ? "" : "s"} twice`);
    // A namespace is `<script>:<class>:<name>`, three parts and no more; anything else cannot be told from another script's.
    const odd = label === "durable-object-namespaces" ? names.filter((x) => x.split(":").length !== 3 || x.split(":").some((part) => part.trim() === "")).length : 0;
    if (odd > 0) problems.push(`${label} has ${odd} entr${odd === 1 ? "y" : "ies"} that ${odd === 1 ? "is" : "are"} not script:class:name`);
  }
  for (const label of KINDS) if (!by.has(label)) problems.push(`${label} was never listed`);
  return { by, problems };
};

const refuse = (prefix) => (PREFIX.test(String(prefix)) ? undefined : `"${prefix}" is not a run's prefix (ortho-<app>-<environment>-<run>)`);
const rows = (by, prefix, keep) => KINDS.flatMap((label) => (by.get(label) ?? []).filter((n) => keep === owns(prefix, ownerOf(label, n))).map((name) => ({ label, name })));
const show = (r) => `${r.label}: ${r.name}`;

/** Exit codes: 0 holds, 1 the account is wrong (a leftover, a change), 2 it cannot be said (a kind unreadable, a bad input). */
export const CLEAN = 0, FAILED = 1, UNREADABLE = 2;

/** After destroy: nothing of this run's is left. A leftover is a failure even when another kind could not be read; a clean verdict needs all four kinds read. */
export const leftovers = (listing, prefix) => {
  const bad = refuse(prefix);
  if (bad) return { exit: UNREADABLE, left: [], lines: [bad] };
  const { by, problems } = read(listing);
  const left = rows(by ?? new Map(), prefix, true);
  const lines = [...left.map((r) => `LEFTOVER ${show(r)}`), ...problems.map((p) => `UNREADABLE ${p}`)];
  if (left.length > 0) return { exit: FAILED, left, lines };
  if (problems.length > 0) return { exit: UNREADABLE, left, lines: [...lines, "cannot say the account is clean"] };
  return { exit: CLEAN, left, lines: ["CLEAN"] };
};

/** Nothing without the prefix changed between two listings: no resource of anyone else's went missing (a destroy that reached too far) or appeared (an `up` that made something unprefixed). */
export const untouched = (before, after, prefix) => {
  const bad = refuse(prefix);
  if (bad) return { exit: UNREADABLE, lines: [bad] };
  const a = read(before), b = read(after);
  const problems = [...a.problems.map((p) => `before: ${p}`), ...b.problems.map((p) => `after: ${p}`)];
  if (problems.length > 0) return { exit: UNREADABLE, lines: [...problems.map((p) => `UNREADABLE ${p}`), "cannot say nothing else changed"] };
  const was = new Set(rows(a.by, prefix, false).map(show));
  const is = new Set(rows(b.by, prefix, false).map(show));
  // PRIVACY: a resource outside the prefix is named by its kind and a count, never by its name (this verdict is uploaded from a public repository).
  const counted = (verb, set) => KINDS.map((label) => [label, [...set].filter((r) => r.startsWith(`${label}: `)).length]).filter(([, n]) => n > 0).map(([label, n]) => `${verb} ${n} ${label} (not this run's)`);
  const lines = [...counted("REMOVED", [...was].filter((r) => !is.has(r))), ...counted("APPEARED", [...is].filter((r) => !was.has(r)))];
  return lines.length > 0 ? { exit: FAILED, lines } : { exit: CLEAN, lines: [`nothing without the prefix changed (${was.size} resources of others, all still there)`] };
};

const LABELS = { worker: "workers", d1: "d1", r2: "r2", "durable-object-namespace": "durable-object-namespaces" };
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
/** What the plan lists, in the listing's own words: a Worker, a database or a bucket by name, a namespace as `<script>:<class>`; or why it cannot be read. */
export const planned = (plan) => {
  const resources = plan?.resources;
  if (!Array.isArray(resources) || resources.length === 0) return { problems: ["the plan lists no resources"] };
  const problems = [];
  const rows = resources.flatMap((r) => {
    const label = Object.hasOwn(LABELS, r?.kind) ? LABELS[r.kind] : undefined;
    const name = r?.kind === "durable-object-namespace" ? (typeof r.script === "string" && IDENTIFIER.test(String(r.class)) ? `${r.script}:${r.class}` : undefined) : r?.name;
    if (label === undefined || typeof name !== "string" || name === "" || (label === "durable-object-namespaces" && name.split(":").length !== 2)) { problems.push(`the plan has a resource that is not one of its kinds: ${JSON.stringify(r)}`); return []; }
    return [{ label, name }];
  });
  for (const dup of rows.filter((r, i) => rows.findIndex((o) => o.label === r.label && o.name === r.name) !== i)) problems.push(`the plan lists ${show(dup)} twice`);
  return { rows, problems };
};

/** While up: the resources with the run's prefix are exactly the plan's, so the plan was true and `up` made nothing it did not say. */
export const made = (plan, during, prefix) => {
  const bad = refuse(prefix) ?? (plan?.prefix === prefix ? undefined : `the plan's prefix is ${JSON.stringify(plan?.prefix)}, not ${prefix}`);
  if (bad) return { exit: UNREADABLE, lines: [bad] };
  const { by, problems } = read(during);
  const asked = planned(plan);
  const unreadable = [...asked.problems, ...problems];
  if (unreadable.length > 0) return { exit: UNREADABLE, lines: [...unreadable.map((p) => `UNREADABLE ${p}`), "cannot say what up made"] };
  // A namespace's own name (the third part) is the API's to choose; the script and class are what the plan says. Counted, so two namespaces of one class are one too many.
  const key = (r) => `${r.label} ${r.label === "durable-object-namespaces" ? r.name.split(":").slice(0, 2).join(":") : r.name}`;
  const count = (list) => list.reduce((n, r) => n.set(key(r), (n.get(key(r)) ?? 0) + 1), new Map());
  const have = rows(by, prefix, true);
  const [wantN, haveN] = [count(asked.rows), count(have)];
  const lines = [
    ...asked.rows.filter((w) => (haveN.get(key(w)) ?? 0) < wantN.get(key(w))).map((w) => `NOT MADE ${show(w)}`),
    ...have.filter((h) => (wantN.get(key(h)) ?? 0) < haveN.get(key(h))).map((h) => `NOT PLANNED ${show(h)}`),
  ];
  return lines.length > 0 ? { exit: FAILED, lines } : { exit: CLEAN, lines: [`up made exactly the ${asked.rows.length} planned resources`] };
};

/** The worst of several verdicts: a failure beats an unreadable listing beats a pass. */
export const worst = (verdicts) => (verdicts.some((v) => v.exit === FAILED) ? FAILED : verdicts.some((v) => v.exit === UNREADABLE) ? UNREADABLE : CLEAN);

/**
 * The listing cut down to what the run's prefix owns, for the evidence upload: the account's other resources are not the run's to publish, and the repository is public. Errors stay (they say
 * which kind could not be read, never a name); every other name goes. A bad prefix returns nothing, so no listing is ever written whole by mistake.
 */
export const ownedOnly = (listing, prefix) => {
  if (refuse(prefix) || !Array.isArray(listing)) return undefined;
  return listing.map((e) => {
    const names = Array.isArray(e?.names) ? { names: e.names.filter((n) => typeof n === "string" && owns(prefix, ownerOf(e.label, n))) } : {};
    const error = e?.error !== undefined ? { error: String(e.error) } : Array.isArray(e?.names) ? {} : { error: "no list of names" };
    return { label: e?.label, ...names, ...error };
  });
};
