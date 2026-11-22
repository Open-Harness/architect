// The judge of check 39: reads a served portal's Alerts, Issues and home pages in a browser and says what is wrong with them, in plain sentences, against a
// TRUTH the check built from the compiler's rules and the calls it made (the oracle), never from anything the portal answered.
// Hooks (`data-portal="<part>"`), which the real client and the reference page both owe:
//   alerts-delivery  one on the Alerts page: data-sent "false" for local, data-environment, and the words "not sent"
//   alert-row        one per (rule, alert) the environment evaluates: data-rule, data-alert, data-kind, data-subject, data-severity, data-owner, data-state ("firing" | "ok" | ...),
//                    showing its subject and its owner; the firing rows first, the pages before the tickets
//   issue-row        one per issue: data-key, data-operation, data-step, data-tag, data-owner, data-occurrences, data-first-seen, data-first-hash, data-last-seen, data-last-hash,
//                    data-regressed "true" | "false", and a `regressed-badge` inside it exactly when regressed; its text also shows the key, the owner, the occurrences and the first and last seen
//                    (as the epoch in ms or as ISO 8601), each as a word of its own; an alert row's text says its state as a word of its own
//   worst-first      on home: `worst-item` per firing rule (data-kind "alert", data-subject the rule id, data-severity the highest firing), per issue (data-kind "issue", data-subject the key),
//                    per operation whose p95 is over its budget (data-kind "breach", data-subject the operation); in that order of kinds, each holding a link to where it is shown
import type { ServedPortal } from "../served-portal/types.ts";
import type { AlertRow, AlertRule } from "./monitor-fixture.ts";

export interface TruthIssue {
  readonly key: string; readonly operation: string; readonly step: string; readonly tag: string; readonly owner: string; readonly occurrences: number;
  readonly firstAt: number; readonly firstHash: string; readonly lastAt: number; readonly lastHash: string; readonly regressed: boolean;
}
export interface Truth {
  readonly environment: string;
  readonly rules: ReadonlyArray<AlertRule>;
  readonly rows: ReadonlyArray<AlertRow>;
  readonly issues: ReadonlyArray<TruthIssue>;
  readonly firing: ReadonlyArray<{ readonly rule: string; readonly severity: string }>;
  readonly breaches: ReadonlyArray<string>;
}
export type Verdicts = Readonly<Record<"alerts" | "issues" | "home", ReadonlyArray<string>>>;

interface El { readonly part: string; readonly attrs: Readonly<Record<string, string>>; readonly text: string; readonly href: string | null; readonly badges: number; readonly links: ReadonlyArray<string> }
const SCAN = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true }) && !e.closest('[hidden],[aria-hidden="true"]') && r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth; };
  return [...document.querySelectorAll("[data-portal]")].filter(vis).map((e) => ({
    part: e.getAttribute("data-portal"),
    attrs: Object.fromEntries([...e.attributes].map((a) => [a.name, a.value])),
    text: e.innerText.replace(/\\s+/g, " ").trim(),
    href: e.getAttribute("href"),
    badges: [...e.querySelectorAll('[data-portal="regressed-badge"]')].filter(vis).length,
    links: [...e.querySelectorAll("a[href]")].filter(vis).map((a) => new URL(a.getAttribute("href"), location.origin).pathname + new URL(a.getAttribute("href"), location.origin).search),
  }));
})()`;
const scan = (portal: ServedPortal, route: string) => portal.evaluate<ReadonlyArray<El>>(route, SCAN);

const once = (els: ReadonlyArray<El>, part: string, where: string, out: Array<string>): El | undefined => {
  const found = els.filter((e) => e.part === part);
  if (found.length !== 1) out.push(`${where}: the page shows ${found.length} \`${part}\`, and it must show exactly one`);
  return found[0];
};
const a = (e: El, name: string) => e.attrs[`data-${name}`] ?? "";
const words = (text: string) => text.split(" ");
/** A time as a person reads it: the epoch in milliseconds, or the same instant as ISO 8601 (with or without the milliseconds, with a `T` or a space). */
const timeWords = (at: number): ReadonlyArray<string> => {
  const iso = new Date(at).toISOString();
  return [String(at), iso, iso.replace(/\.\d{3}Z$/, "Z"), iso.replace("T", " "), iso.replace("T", " ").replace(/\.\d{3}Z$/, "Z")];
};
const subjectOf = (r: AlertRule) => r.labels["operation"] ?? r.labels["code"] ?? r.labels["journey"] ?? "";

export const judgeAlerts = async (portal: ServedPortal, truth: Truth): Promise<ReadonlyArray<string>> => {
  const out: Array<string> = [];
  const route = "/portal/monitor/alerts";
  const els = await scan(portal, route);
  const delivery = once(els, "alerts-delivery", route, out);
  if (delivery !== undefined) {
    if (a(delivery, "sent") !== "false") out.push(`${route}: ${truth.environment} sends nothing, and the page says data-sent "${a(delivery, "sent")}"`);
    if (!/not sent/i.test(delivery.text)) out.push(`${route}: the page does not say the alerts are "not sent" (it says "${delivery.text}")`);
    if (a(delivery, "environment") !== truth.environment) out.push(`${route}: alerts-delivery names the environment "${a(delivery, "environment")}", not ${truth.environment}`);
  }
  const rows = els.filter((e) => e.part === "alert-row");
  const byRule = new Map(truth.rules.map((r) => [r.id, r]));
  for (const want of truth.rows) {
    const mine = rows.filter((r) => a(r, "rule") === want.rule && a(r, "alert") === want.alert);
    const where = `${route}: ${want.rule} / ${want.alert}`;
    if (mine.length !== 1) { out.push(`${where} is shown ${mine.length} times, and it is one row`); continue; }
    const row = mine[0]!;
    const rule = byRule.get(want.rule)!;
    if (a(row, "kind") !== rule.kind) out.push(`${where}: data-kind is "${a(row, "kind")}", not ${rule.kind}`);
    if (a(row, "subject") !== subjectOf(rule)) out.push(`${where}: data-subject is "${a(row, "subject")}", not ${subjectOf(rule)}`);
    if (a(row, "severity") !== want.severity) out.push(`${where}: data-severity is "${a(row, "severity")}", not ${want.severity}`);
    if (a(row, "owner") !== rule.labels["owner"]) out.push(`${where}: data-owner is "${a(row, "owner")}", not ${rule.labels["owner"]}`);
    if (want.state === "any" ? !["ok", "firing", "unknown"].includes(a(row, "state")) : a(row, "state") !== want.state) out.push(`${where}: data-state is "${a(row, "state")}", and the calls say ${want.state}`);
    if (want.state !== "any" && !words(row.text).includes(want.state)) out.push(`${where}: the row does not say "${want.state}" to a person, as a word of its own ("${row.text}")`);
    if (!row.text.includes(subjectOf(rule)) || !row.text.includes(rule.labels["owner"]!)) out.push(`${where}: the row does not show its subject and its owner to a person ("${row.text}")`);
  }
  const wanted = new Set(truth.rows.map((r) => `${r.rule}|${r.alert}`));
  for (const row of rows) if (!wanted.has(`${a(row, "rule")}|${a(row, "alert")}`)) out.push(`${route}: a row for ${a(row, "rule")} / ${a(row, "alert")}, which ${truth.environment} does not evaluate`);
  const states = rows.map((r) => a(r, "state") === "firing" ? (a(r, "severity") === "page" ? 0 : 1) : 2);
  if (states.some((s, i) => i > 0 && s < states[i - 1]!)) out.push(`${route}: the rows are not worst first (firing pages, firing tickets, then the rest)`);
  return out;
};

export const judgeIssues = async (portal: ServedPortal, truth: Truth): Promise<ReadonlyArray<string>> => {
  const out: Array<string> = [];
  const route = "/portal/monitor/issues";
  const els = await scan(portal, route);
  const rows = els.filter((e) => e.part === "issue-row");
  for (const want of truth.issues) {
    const mine = rows.filter((r) => a(r, "key") === want.key);
    const where = `${route}: ${want.key}`;
    if (mine.length !== 1) { out.push(`${where} is shown ${mine.length} times, and it is one row`); continue; }
    const row = mine[0]!;
    const same: ReadonlyArray<readonly [string, string, string | number | boolean]> = [
      ["operation", a(row, "operation"), want.operation], ["step", a(row, "step"), want.step], ["tag", a(row, "tag"), want.tag], ["owner", a(row, "owner"), want.owner],
      ["occurrences", a(row, "occurrences"), want.occurrences], ["first-seen", a(row, "first-seen"), want.firstAt], ["first-hash", a(row, "first-hash"), want.firstHash],
      ["last-seen", a(row, "last-seen"), want.lastAt], ["last-hash", a(row, "last-hash"), want.lastHash], ["regressed", a(row, "regressed"), want.regressed],
    ];
    for (const [name, got, wantValue] of same) if (got !== String(wantValue)) out.push(`${where}: data-${name} is "${got}", not ${wantValue}`);
    if ((row.badges > 0) !== want.regressed) out.push(`${where}: ${want.regressed ? "regressed, and no `regressed-badge` shows it" : "not regressed, and a `regressed-badge` says so"}`);
    if (!row.text.includes(want.key) || !row.text.includes(want.owner)) out.push(`${where}: the row does not show its key and its owner to a person ("${row.text}")`);
    const seen = words(row.text);
    if (!seen.includes(String(want.occurrences))) out.push(`${where}: the row does not show its ${want.occurrences} occurrences as text ("${row.text}"), only a data attribute can hold them`);
    if (!timeWords(want.firstAt).some((t) => seen.includes(t))) out.push(`${where}: the row does not show when it was first seen as text, ${timeWords(want.firstAt)[1]} ("${row.text}")`);
    if (!timeWords(want.lastAt).some((t) => seen.includes(t))) out.push(`${where}: the row does not show when it was last seen as text, ${timeWords(want.lastAt)[1]} ("${row.text}")`);
  }
  const wanted = new Set(truth.issues.map((i) => i.key));
  for (const row of rows) if (!wanted.has(a(row, "key"))) out.push(`${route}: a row for ${a(row, "key")}, which is no issue (a refusal opens none)`);
  return out;
};

export const judgeHome = async (portal: ServedPortal, truth: Truth): Promise<ReadonlyArray<string>> => {
  const out: Array<string> = [];
  const route = "/portal";
  const els = await scan(portal, route);
  once(els, "worst-first", route, out);
  const items = els.filter((e) => e.part === "worst-item");
  const rank = { alert: 0, issue: 1, breach: 2 } as const;
  const kinds = items.map((i) => rank[a(i, "kind") as keyof typeof rank] ?? 9);
  if (kinds.some((k, i) => i > 0 && k < kinds[i - 1]!)) out.push(`${route}: the list is not worst first (firing alerts, then open issues, then budget breaches)`);
  const severities = items.filter((i) => a(i, "kind") === "alert").map((i) => (a(i, "severity") === "page" ? 0 : 1));
  if (severities.some((s, i) => i > 0 && s < severities[i - 1]!)) out.push(`${route}: a ticket is listed before a page`);
  const want: ReadonlyArray<readonly [string, string, string | undefined, string]> = [
    ...truth.firing.map((f) => ["alert", f.rule, f.severity, "/portal/monitor/alerts"] as const),
    ...truth.issues.map((i) => ["issue", i.key, undefined, "/portal/monitor/issues"] as const),
    ...truth.breaches.map((op) => ["breach", op, undefined, `/portal/operations/${op}`] as const),
  ];
  for (const [kind, subject, severity, href] of want) {
    const mine = items.filter((i) => a(i, "kind") === kind && a(i, "subject") === subject);
    const where = `${route}: ${kind} ${subject}`;
    if (mine.length !== 1) { out.push(`${where} is listed ${mine.length} times, and it is once`); continue; }
    if (severity !== undefined && a(mine[0]!, "severity") !== severity) out.push(`${where}: data-severity is "${a(mine[0]!, "severity")}", not ${severity}`);
    if (!mine[0]!.links.some((l) => l === href || l.startsWith(`${href}?`))) out.push(`${where}: no link to ${href} (links: ${mine[0]!.links.join(", ") || "none"})`);
    if (!mine[0]!.text.includes(subject)) out.push(`${where}: the item does not show its subject ("${mine[0]!.text}")`);
  }
  const wanted = new Set(want.map(([k, s]) => `${k}|${s}`));
  for (const i of items) if (!wanted.has(`${a(i, "kind")}|${a(i, "subject")}`)) out.push(`${route}: an item for ${a(i, "kind")} ${a(i, "subject")}, which is not firing, open or over budget`);
  return out;
};

export const judge = async (portal: ServedPortal, truth: Truth): Promise<Verdicts> => ({
  alerts: await judgeAlerts(portal, truth), issues: await judgeIssues(portal, truth), home: await judgeHome(portal, truth),
});
