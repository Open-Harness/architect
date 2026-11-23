// The judge of check 28 (ST1.22, S-31): reads a served portal's pages and says what is wrong with its rules. The wire and the rules it judges against come from `rules-fixture.ts`.
import type { ServedPortal } from "../served-portal/types.ts";
import type { Raw, Rule } from "./rules-fixture.ts";

// ---- reading a page ----

/** In the page: every hook this check reads, as plain data. `__NAMES__` is the refusals the rules own. */
const SCAN = `(() => {
  const names = __NAMES__;
  // Only what a person can see counts: not display:none, visibility:hidden, opacity 0, \`hidden\` or aria-hidden.
  const vis = (e) => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true }) && !e.closest('[hidden],[aria-hidden="true"]');
  const q = (s, from = document) => [...from.querySelectorAll(s)].filter(vis);
  const a = (e, n) => e.getAttribute(n) ?? "";
  const text = (e, s) => (q(s, e)[0]?.innerText ?? "").trim();
  const bare = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (["SCRIPT", "STYLE"].includes(n.parentElement?.tagName ?? "") || !n.parentElement || !vis(n.parentElement)) continue;
    for (const name of names) if (n.data.includes(name) && !n.parentElement?.closest('[data-portal="refusal"]')) bare.push({ name, text: n.data.trim().slice(0, 80) });
  }
  return {
    origin: location.origin,
    sectionText: q('[data-portal="rules"]').map((e) => e.innerText).join(" "),
    lifecycleText: q('[data-portal="lifecycle"]').map((e) => e.innerText).join(" "),
    order: q("[data-portal]").map((e) => a(e, "data-portal")).filter((h) => ["lifecycle", "rules", "operation-row"].includes(h)),
    sections: q('[data-portal="rules"]').length,
    strays: q('[data-portal="rule"]').filter((e) => !e.closest('[data-portal="rules"]')).length,
    rules: q('[data-portal="rules"] [data-portal="rule"]').map((e) => ({ rule: a(e, "data-rule"), fields: a(e, "data-fields"), while: a(e, "data-while"), refuse: a(e, "data-refuse"), described: a(e, "data-described"), id: e.id, sentence: text(e, '[data-portal="rule-sentence"]'), sentences: q('[data-portal="rule-sentence"]', e).length, text: e.innerText })),
    refusals: q('[data-portal="refusal"]').map((e) => { const l = q('a[data-portal="rule-link"]', e)[0] ?? null; return { name: a(e, "data-refusal"), rule: a(e, "data-rule"), sentence: text(e, '[data-portal="refusal-sentence"]'), sentences: q('[data-portal="refusal-sentence"]', e).length, links: q('a[data-portal="rule-link"]', e).length, inSpine: e.closest('[data-portal="spine-stop"]') !== null, text: e.innerText, linkText: l === null ? "" : l.innerText.trim(), abs: l === null ? null : l.href, href: l === null ? null : a(l, "href") }; }),
    lifecycles: q('[data-portal="lifecycle"]').length,
    bare,
    spineRules: q('[data-portal="spine-rule"]').map((e) => { const own = q('a[data-portal="rule-link"]', e).filter((x) => !x.closest('[data-portal="refusal"]')), l = own[0] ?? null; return { rule: a(e, "data-rule"), inRulesStop: e.closest('[data-portal="spine-stop"][data-stop="rules"]') !== null, sentence: text(e, '[data-portal="spine-rule-sentence"]'), sentences: q('[data-portal="spine-rule-sentence"]', e).length, links: own.length, linkText: l === null ? "" : l.innerText.trim(), abs: l === null ? null : l.href, href: l === null ? null : a(l, "href"), refusals: q('[data-portal="refusal"]', e).length }; }),
    stops: q('[data-portal="spine-stop"]').map((e) => ({ stop: a(e, "data-stop"), rules: a(e, "data-rules"), text: e.innerText })),
    ids: q("[id]").map((e) => e.id),
  };
})()`;
interface Seen {
  origin: string; sectionText: string; lifecycleText: string; order: Array<string>; lifecycles: number; sections: number; strays: number; rules: Array<{ rule: string; fields: string; while: string; refuse: string; described: string; id: string; sentence: string; sentences: number; text: string }>;
  refusals: Array<{ name: string; rule: string; sentence: string; sentences: number; links: number; inSpine: boolean; text: string; linkText: string; abs: string | null; href: string | null }>; bare: Array<{ name: string; text: string }>;
  stops: Array<{ stop: string; rules: string; text: string }>; ids: Array<string>;
  spineRules: Array<{ rule: string; inRulesStop: boolean; sentence: string; sentences: number; links: number; linkText: string; abs: string | null; href: string | null; refusals: number }>;
}
const scan = (portal: ServedPortal, route: string, names: ReadonlyArray<string>) => portal.evaluate<Seen>(route, SCAN.replace("__NAMES__", JSON.stringify(names)));

/** What a rule's sentence must carry, from the model: its thing, every state it holds in and every field it keys on. The words around are the builder's. */
const carries = (r: Rule) => [r.thing, ...r.while, ...r.fields];

export type Verdicts = Readonly<Record<"section" | "sentences" | "refusals" | "spine", ReadonlyArray<string>>>;

/** Everything wrong with the portal's rules, said in plain sentences, in four groups; all four empty is a portal that does what G5's screen calls decided (1A 2A 3A 4A). */
export const judge = async (portal: ServedPortal, wire: { model: Raw["model"] }, rules: ReadonlyArray<Rule>): Promise<Verdicts> => {
  const out = { section: [] as Array<string>, sentences: [] as Array<string>, refusals: [] as Array<string>, spine: [] as Array<string> };
  const owned = [...new Set(rules.flatMap((r) => (r.refuse === undefined ? [] : [r.refuse])))];
  const full = (r: Rule) => `${r.thing}.${r.name}`;
  const cache = new Map<string, Seen>();
  const read = async (route: string) => { const hit = cache.get(route); if (hit !== undefined) return hit; const seen = await scan(portal, route, owned); cache.set(route, seen); return seen; };
  const rows = new Map<string, Seen["rules"][number]>();

  for (const thing of Object.keys(wire.model.things)) {
    const mine = rules.filter((r) => r.thing === thing);
    const page = await read(`/portal/things/${thing}`);
    for (const row of page.rules) rows.set(row.rule, row);
    if (mine.length === 0) { if (page.sections > 0 || page.strays > 0) out.section.push(`/portal/things/${thing} has a Rules section but declares no rule`); continue; }
    if (page.sections !== 1) out.section.push(`/portal/things/${thing} has ${page.sections} Rules sections (\`[data-portal="rules"]\`), it needs one, holding its rows`);
    if (page.strays > 0) out.section.push(`/portal/things/${thing}: ${page.strays} rule rows sit outside the Rules section`);
    const dupIds = page.ids.filter((id, i) => id !== "" && page.ids.indexOf(id) !== i);
    for (const id of new Set(dupIds)) out.section.push(`/portal/things/${thing}: id "${id}" is on ${page.ids.filter((i) => i === id).length} elements: a link's fragment must reach one`);
    if (page.sections === 1 && !/rules/i.test(page.sectionText)) out.section.push(`/portal/things/${thing}: the Rules section does not say Rules`);
    const states = ((wire.model.things[thing] as { machine?: { states?: ReadonlyArray<string> } }).machine?.states) ?? [];
    if (page.lifecycles === 1) for (const st of states) if (!page.lifecycleText.includes(st)) out.section.push(`/portal/things/${thing}: the lifecycle does not show the state ${st}`);
    if (page.lifecycles > 1) out.section.push(`/portal/things/${thing} has ${page.lifecycles} lifecycles, it needs one`);
    const seen = new Map(page.rules.map((r) => [r.rule, r] as const));
    for (const [rule, n] of Object.entries(page.rules.reduce<Record<string, number>>((all, r) => ({ ...all, [r.rule]: (all[r.rule] ?? 0) + 1 }), {}))) if (n > 1) out.section.push(`/portal/things/${thing} shows ${rule} ${n} times: one row per rule`);
    if ([...seen.keys()].sort().join() !== mine.map(full).sort().join()) out.section.push(`/portal/things/${thing} lists rules [${[...seen.keys()]}], the wire declares [${mine.map(full)}]: a Rules section of one row per rule, each \`[data-portal="rule"][data-rule]\``);
    const at = (hook: string) => page.order.indexOf(hook);
    const machine = (wire.model.things[thing] as { machine?: unknown }).machine;
    if (machine && at("lifecycle") < 0) out.section.push(`/portal/things/${thing} has a machine and no \`[data-portal="lifecycle"]\`: the Rules go under the lifecycle, so it must be there`);
    if (page.sections === 1 && at("rules") >= 0 && at("lifecycle") >= 0 && at("rules") < at("lifecycle")) out.section.push(`/portal/things/${thing}: Rules come before the lifecycle, not under it`);
    if (at("rules") >= 0 && at("operation-row") >= 0 && at("rules") > at("operation-row")) out.section.push(`/portal/things/${thing}: Rules come after the operations, not under the lifecycle`);
    for (const r of mine) {
      const row = seen.get(full(r));
      if (row === undefined) continue;
      if (row.fields !== r.fields.join(",") || row.while !== r.while.join(",") || row.refuse !== (r.refuse ?? "")) out.section.push(`${full(r)}: the row says fields "${row.fields}", while "${row.while}", refuses "${row.refuse}"; the model says "${r.fields}", "${r.while}", "${r.refuse ?? ""}"`);
      if (row.sentences !== 1) out.sentences.push(`${full(r)}: its row has ${row.sentences} \`rule-sentence\` elements, it needs one`);
      if (!row.text.includes(r.name)) out.section.push(`${full(r)}: the row's data-rule says it, the page does not show its name "${r.name}"`);
      if (r.refuse !== undefined && !row.text.includes(r.refuse)) out.section.push(`${full(r)}: the row's data-refuse says ${r.refuse}, the page does not show it`);
      if (row.id === "") out.section.push(`${full(r)}: the row has no id, so no refusal can link to it`);
    }
  }

  for (const r of rules) {
    const row = rows.get(full(r));
    if (row === undefined) { out.sentences.push(`${full(r)}: no row, so no sentence`); continue; }
    if (r.description !== undefined) {
      if (row.sentence !== r.description) out.sentences.push(`${full(r)}: its description is "${r.description}" and the row says "${row.sentence}": a written description replaces the generated sentence`);
      if (row.described !== "true") out.sentences.push(`${full(r)}: data-described should be "true"`);
    } else {
      const lower = row.sentence.toLowerCase();
      const missing = carries(r).filter((w) => !lower.includes(w.toLowerCase()));
      if (row.sentence === "" || missing.length > 0) out.sentences.push(`${full(r)}: the generated sentence "${row.sentence}" does not carry the model's ${missing.join(", ")}`);
      if (row.described !== "false") out.sentences.push(`${full(r)}: data-described should be "false"`);
      for (const other of rules) if (other.description !== undefined && lower.includes(other.description.toLowerCase())) out.sentences.push(`${full(r)}: its sentence repeats another rule's description`);
    }
  }

  const routes = ["/portal", ...Object.keys(wire.model.things).map((t) => `/portal/things/${t}`), ...Object.keys(wire.model.operations).map((o) => `/portal/operations/${o}`), "/portal/reference/refusals"];
  const checkRefusal = async (route: string, page: Seen, f: Seen["refusals"][number]) => {
    const rule = rules.find((r) => r.refuse === f.name);
    if (rule === undefined) { if (f.rule !== "" || f.href !== null || f.links > 0) out.refusals.push(`${route}: ${f.name} is no rule's refusal and still links to "${f.rule}"`); return; }
    const row = rows.get(full(rule));
    if (f.rule !== full(rule)) out.refusals.push(`${route}: ${f.name} names rule "${f.rule}", the model gives "${full(rule)}"`);
    if (!f.text.includes(f.name)) out.refusals.push(`${route}: the element says ${f.name} in data-refusal, the page does not show it`);
    if (f.sentences !== 1) out.refusals.push(`${route}: ${f.name} has ${f.sentences} \`refusal-sentence\` elements, it needs one`);
    if (f.links !== 1) out.refusals.push(`${route}: ${f.name} has ${f.links} \`rule-link\` anchors, it needs one`);
    if (row === undefined || f.sentence !== row.sentence) out.refusals.push(`${route}: ${f.name} reads "${f.sentence}", its rule's row reads "${row?.sentence}": one sentence on every surface`);
    if (!f.linkText.includes(rule.name)) out.refusals.push(`${route}: ${f.name}'s link reads "${f.linkText}", it does not name its rule ${rule.name}`);
    const dest = f.abs === null ? undefined : new URL(f.abs);
    if (dest === undefined || dest.origin !== page.origin) { out.refusals.push(`${route}: ${f.name} links to ${f.abs ?? "nothing"}, which leaves the portal (${page.origin})`); return; }
    const [target, fragment = ""] = [dest.pathname, dest.hash.slice(1)];
    if (target !== `/portal/things/${rule.thing}` || fragment === "") { out.refusals.push(`${route}: ${f.name} links to ${f.href ?? "nothing"}, not to a row of ${rule.thing}'s page`); return; }
    const there = await read(target!).catch(() => undefined);
    const owners = (there?.ids ?? []).filter((id) => id === fragment).length;
    const landed = there?.rules.find((r) => r.id === fragment);
    if (owners !== 1 || landed?.rule !== full(rule)) out.refusals.push(`${route}: ${f.name} links to #${fragment}, which is ${owners} elements and ${landed === undefined ? "no rule row" : `the row of ${landed.rule}`}, not exactly its rule's row (${full(rule)})`);
  };
  for (const route of routes) {
    // The reference page is an optional surface: a portal with no such route is not a portal that hides a refusal.
    const page = await read(route).catch((error: unknown) => { if (route === "/portal/reference/refusals") return undefined; throw error; });
    if (page === undefined) continue;
    for (const b of page.bare) out.refusals.push(`${route}: "${b.name}" is shown as plain text ("${b.text}"), not as a \`[data-portal="refusal"]\` that carries its rule's sentence and a link`);
    for (const f of page.refusals) await checkRefusal(route, page, f);
  }
  // And each operation's own page, against its own contract: every refusal a rule owns there is shown once in the page's own list (the spine's
  // rules stop may name them again, inside the stop), as its rule's sentence, linked; and none the operation does not have.
  for (const [name, op] of Object.entries(wire.model.operations)) {
    const page = await read(`/portal/operations/${name}`).catch(() => undefined);
    for (const [refusal, owner] of Object.entries(op.invariants ?? {})) {
      const listed = page?.refusals.filter((f) => f.name === refusal && !f.inSpine).length ?? 0;
      if (listed !== 1) out.refusals.push(`/portal/operations/${name}: its refusal ${refusal} (owned by ${owner}) is shown ${listed} times in the page's own list, it needs one \`[data-portal="refusal"]\` there`);
    }
    for (const f of page?.refusals ?? []) {
      if (!op.refusals.includes(f.name)) out.refusals.push(`/portal/operations/${name}: shows ${f.name}, which is not one of its refusals`);
      if (f.inSpine && !Object.keys(op.invariants ?? {}).includes(f.name)) out.refusals.push(`/portal/operations/${name}: its rules stop shows ${f.name}, which no rule of this operation owns`);
    }
  }

  for (const [name, op] of Object.entries(wire.model.operations)) {
    const opPage = await read(`/portal/operations/${name}`);
    const stops = opPage.stops;
    // S-31: the stop lists what the model says the operation can BREAK (`breaks`), not only the rules it attaches a refusal for (`invariants`).
    const attached = [...new Set(op.breaks ?? [])].sort();
    const hasMove = op.move !== null && op.move !== undefined;
    for (const stop of new Set(stops.map((s) => s.stop))) if (stops.filter((s) => s.stop === stop).length > 1) out.spine.push(`${name}: the spine has the ${stop} stop more than once`);
    const at = stops.findIndex((s) => s.stop === "rules");
    // Every `spine-rule` on the page is judged first, whether or not the operation can break a rule: one outside the rules stop is wrong anywhere, and an operation that breaks none has none.
    const inStop = opPage.spineRules.filter((x) => x.inRulesStop);
    if (opPage.spineRules.length !== inStop.length) out.spine.push(`${name}: a \`spine-rule\` outside the rules stop`);
    const named = inStop.map((x) => x.rule);
    if (at >= 0 || named.length > 0) if ([...new Set(named)].sort().join() !== attached.join() || named.length !== new Set(named).size) out.spine.push(`${name}: the rules stop has a \`[data-portal="spine-rule"]\` for [${named}], the model says it breaks [${attached}], one each`);
    if (attached.length === 0) { if (at >= 0) out.spine.push(`${name}: a rules stop on the spine of an operation that can break no rule`); continue; }
    const [move, commit] = [stops.findIndex((s) => s.stop === "move"), stops.findIndex((s) => s.stop === "commit")];
    if (at < 0) { out.spine.push(`${name}: the spine has no \`[data-portal="spine-stop"][data-stop="rules"]\``); continue; }
    if (!((hasMove ? move >= 0 && move < at : true) && at < commit)) out.spine.push(`${name}: the rules stop is not between the move and the commit (stops: ${stops.map((s) => s.stop)})`);
    const rulesStop = stops[at]!;
    const everyRule = rules.map((r) => r.name);
    const shownNames = everyRule.filter((n) => new RegExp(`\\b${n}\\b`).test(rulesStop.text));
    const modelNames = attached.map((f) => f.split(".")[1]!).sort();
    if (shownNames.slice().sort().join() !== modelNames.join()) out.spine.push(`${name}: the rules stop shows the rules [${shownNames}] but the model says it breaks [${modelNames}]: its data-rules is not what a person reads`);
    for (const w of ["move", "commit"]) { const stop = stops.find((x) => x.stop === w); if (stop !== undefined && !new RegExp(w, "i").test(stop.text)) out.spine.push(`${name}: the ${w} stop's text says "${stop.text.trim()}", not ${w}`); }
    const listed = rulesStop.rules.split(",").filter(Boolean);
    if (new Set(listed).size !== listed.length) out.spine.push(`${name}: the rules stop names a rule twice ("${stops[at]!.rules}")`);
    if ([...new Set(listed)].sort().join() !== attached.join()) out.spine.push(`${name}: the rules stop lists "${stops[at]!.rules}", the model says it breaks [${attached}]`);
    // Each rule in the stop is a `spine-rule`: its sentence (the rule's own, one sentence on every surface) and a link to its row; a rule that owns no
    // refusal shows no refusal. One per broken rule, none for another.
    for (const x of inStop) {
      const rule = rules.find((r) => full(r) === x.rule);
      if (rule === undefined) continue;
      const row = rows.get(x.rule);
      if (x.sentences !== 1 || x.sentence !== row?.sentence) out.spine.push(`${name}: the rules stop says "${x.sentence}" (${x.sentences} \`spine-rule-sentence\`) for ${x.rule}, its row reads "${row?.sentence}": one sentence on every surface`);
      if (!x.linkText.includes(rule.name)) out.spine.push(`${name}: the rules stop's link for ${x.rule} reads "${x.linkText}", it does not name ${rule.name}`);
      if (x.links !== 1) out.spine.push(`${name}: the rules stop has ${x.links} \`rule-link\` anchors for ${x.rule}, it needs one`);
      if (rule.refuse === undefined && x.refusals > 0) out.spine.push(`${name}: the rules stop shows a refusal for ${x.rule}, which owns none`);
      const dest = x.abs === null ? undefined : new URL(x.abs);
      const there = dest === undefined || dest.origin !== opPage.origin || dest.pathname !== `/portal/things/${rule.thing}` || dest.hash === "" ? undefined : await read(dest.pathname).catch(() => undefined);
      const landed = there?.rules.find((r) => r.id === dest!.hash.slice(1));
      if (landed?.rule !== x.rule || (there?.ids ?? []).filter((id) => id === dest!.hash.slice(1)).length !== 1) out.spine.push(`${name}: the rules stop's link for ${x.rule} goes to ${x.href ?? "nothing"}, not to exactly its row on /portal/things/${rule.thing}`);
    }
  }
  return out;
};
