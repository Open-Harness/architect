// Check 28 (ST1.22, G5): the portal shows rules, read in headless Chromium over the served portal, as check 21 reads it.
// G5's screen calls, decided by Aaron on 20 November 2026 (`design/decisions/G5-invariants-ui-grill.md`, 1A 2A 3A 4A):
//   1. a Rules section under a thing's lifecycle, one row per rule;
//   2. every refusal a rule owns, on every surface that shows one, reads as the rule's sentence (generated from the model, or the rule's own
//      `description`, which replaces it) and links to the rule's row;
//   3. a "rules" stop on an operation's spine, between the move and the commit, for an operation that can break a rule. S-31 (design/decisions/S31-breaks.md):
//      "can break" is the model's `operations.<op>.breaks`, every rule it can break, with or without a refusal, not `invariants` (only the rules that refuse):
//      handle.claim's stop lists its two rules and `profile.onePagePerHandle`, which owns no refusal, so that one shows its sentence and its link and no refusal.
//      profile.get is a read (`writes: []`): it breaks nothing and has no rules stop. The renamed variant also PLANTS a different `breaks` (the page rule off
//      handle.claim, on handle.resolve and link.add, which attach no refusal at all): only a portal that reads `breaks` passes both variants.
// Plugged In keeps its three one-line `unique` rules until ST1.19, so the check works against them as they stand: the rules are read out of the wire
// (`rules-fixture.ts` writes them in the way G5 section 3 says the model carries them) and the portal gets them from the wire alone. Not passable by
// a portal with the words written in: the second variant renames the rules, changes one scope, re-words one rule and drops another's description.
//
// What a builder owes, hooks as in check 21 (`data-portal="<part>"`):
//   rules          a thing's Rules section, after `lifecycle` and before the first `operation-row`; absent when the thing has none
//   rule           one row in it: id (the link's target), data-rule "<thing>.<rule>", data-fields, data-while (comma joined), data-refuse (""
//                  when it owns none), data-described "true" when it carries a description; containing `rule-sentence`
//   refusal        wherever the portal shows a refusal a rule owns (an operation's refusals, a thing's errors, the spine, the reference page):
//                  data-refusal, data-rule, containing `refusal-sentence` and an `a[data-portal="rule-link"]` to `/portal/things/<thing>#<row id>`
//   spine-stop     on an operation's page, data-stop "move" | "rules" | "commit" in that order, the rules stop with data-rules (comma joined, the model's `breaks`)
//   spine-rule     in the rules stop, one per rule in `breaks`: data-rule "<thing>.<rule>", a `spine-rule-sentence` (the rule's own sentence) and one
//                  `a[data-portal="rule-link"]` to its row; a rule that owns no refusal has no `refusal` in it, one that does may name it
// The wire (ST1.17): `model.things.<t>.invariants.<rule>` { kind, fields, while, refuse?, description? } and `model.operations.<op>.invariants`
// { <refusal>: "<thing>.<rule>" }, and `operations.<op>.breaks` ["<thing>.<rule>"]; `Wire`'s schema keeps all three (today it drops them: the fixture hands the portal the signed JSON). A refusal of a rule's is plain text nowhere. A sentence carries the model's thing, states and fields.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ServedPortals } from "../served-portal/service.ts";
import type { PortalServerModule, ServedPortal } from "../served-portal/types.ts";
import { AS_THEY_STAND, PLANTED, PLANTED_BREAKS, withRules, type Built, type Naming } from "./rules-fixture.ts";
import { judge, type Verdicts } from "./rules-judge.ts";
import { standIn } from "./rules-standin.ts";
import { repo } from "./support.ts";

const pluggedIn = JSON.parse(readFileSync(join(repo, "examples/plugged-in/generated/portal/blueprint.json"), "utf8")) as unknown;
afterAll(async () => { await ServedPortals.closeAll(); });

/** A variant's wire: the renamed one also plants a `breaks` that is not the compiler's (`PLANTED_BREAKS`). */
const build = (naming: Naming): Promise<Built> => withRules(pluggedIn, naming, naming === AS_THEY_STAND, naming === PLANTED ? PLANTED_BREAKS : undefined);
const standInServer: PortalServerModule = { PortalServer: { handle: (context, request) => Promise.resolve(new URL(request.url).pathname === "/_portal/v1/blueprint" ? Response.json((context as { blueprint: unknown }).blueprint) : new Response("no", { status: 404 })) } };
const run = (effect: unknown) => effect as Promise<Response>;
const context = (built: Built) => ({ blueprint: built.wire, reader: null, bundleRevision: null });
const dirs: Array<string> = [];
const clientDir = (hardcoded: boolean) => {
  const dir = mkdtempSync(join(tmpdir(), "rules-standin-"));
  dirs.push(dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), standIn(hardcoded));
  return dir;
};
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

/** The portal as the repository builds it: the real server half and the built client, read the way a person reads it. */
const real = (built: Built): Promise<ServedPortal> => ServedPortals.open({ context: context(built) });
const standing = (built: Built, hardcoded: boolean): Promise<ServedPortal> => ServedPortals.open({ context: context(built), clientDir: clientDir(hardcoded), server: standInServer, run });

/** The reference page with some of its text changed, and what the judge says of it. */
const judgedWith = async (changes: ReadonlyArray<readonly [string, string]>, naming: Naming = AS_THEY_STAND): Promise<Verdicts> => {
  const built = await build(naming);
  const dir = mkdtempSync(join(tmpdir(), "rules-broken-"));
  dirs.push(dir);
  let html = standIn(false);
  for (const [from, to] of changes) {
    if (!html.includes(from)) throw new Error(`the stand-in has no ${from}: the control is out of date`);
    html = html.replace(from, to);
  }
  writeFileSync(join(dir, "index.html"), html);
  const portal = await ServedPortals.open({ context: context(built), clientDir: dir, server: standInServer, run });
  try { return await judge(portal, built.wire, built.rules); } finally { await portal.close(); }
};

const verdicts = async (open: () => Promise<ServedPortal>, built: Built): Promise<Verdicts> => {
  const portal = await open();
  try { return await judge(portal, built.wire, built.rules); } finally { await portal.close(); }
};
const all = (v: Verdicts) => [...v.section, ...v.sentences, ...v.refusals, ...v.spine];

describe("28 control: the fixture and the judge are sound", () => {
  it("the rules are read out of Plugged In's own `unique` entries, and the wire that carries them decodes and names them as G5's model does", async () => {
    const built = await build(AS_THEY_STAND);
    // Until ST1.19 the scope is read from the wire's one-liner; from it, from the rule the wire carries (both are the wire's own, never the check's).
    const things = (pluggedIn as { model: { things: Record<string, { unique?: Record<string, { while?: ReadonlyArray<string> }>; invariants?: Record<string, { while?: ReadonlyArray<string> }> }> } }).model.things;
    const scope = things["handle"]!.unique?.["name"]?.while ?? things["handle"]!.invariants?.["oneHolderPerName"]?.while;
    expect(scope, "Plugged In's wire says where the name rule holds").toEqual(["claimed"]);
    expect(built.rules.map((r) => `${r.thing}.${r.name}`)).toEqual(["handle.oneHolderPerName", "handle.oneNamePerPerson", "profile.onePagePerHandle"]);
    expect(built.rules.find((r) => r.name === "oneHolderPerName")?.while, "the scope is the wire's own").toEqual(scope);
    const model = built.wire.model;
    expect(model.operations["handle.claim"]!.invariants).toEqual({ HandleTaken: "handle.oneHolderPerName", HandleAlreadyOwned: "handle.oneNamePerPerson" });
    expect(model.operations["handle.claim"]!.errors, "an invariant's error leaves `errors` (G5 section 3)").toEqual([]);
    expect(model.operations["handle.release"]!.invariants, "release only leaves `claimed`: no rule attached").toBeUndefined();
    expect(model.operations["handle.claim"]!.breaks, "claim breaks all three, the page rule owns no refusal").toEqual(["handle.oneHolderPerName", "handle.oneNamePerPerson", "profile.onePagePerHandle"]);
    expect(model.operations["handle.release"]!.breaks, "release breaks none").toEqual([]);
    expect(model.operations["profile.get"]!.breaks, "profile.get is a read (`writes: []`): it writes no row, so it breaks nothing and has no rules stop").toEqual([]);
    expect(model.operations["profile.get"]!.invariants, "and no refusal to attach").toBeUndefined();
    for (const [op, entry] of Object.entries(model.operations)) if (op !== "handle.claim") expect(entry.breaks, `${op}: only claim writes a rule's records`).toEqual([]);
  });

  it("a portal drawn from the wire passes the judge, as Plugged In stands and as planted", { timeout: 120_000 }, async () => {
    for (const naming of [AS_THEY_STAND, PLANTED]) {
      const built = await build(naming);
      expect(all(await verdicts(() => standing(built, false), built)), `the reference page of ${Object.values(naming).map((n) => n.name)}`).toEqual([]);
    }
  });

  it("a portal with Plugged In's words written in passes as it stands, and is refused once the wire is renamed and re-worded", { timeout: 120_000 }, async () => {
    const stands = await build(AS_THEY_STAND);
    const planted = await build(PLANTED);
    expect(all(await verdicts(() => standing(stands, true), stands)), "the written-in words are right for the wire they were written for").toEqual([]);
    const hard = await verdicts(() => standing(planted, true), planted);
    expect(hard.sentences.length, "the renamed rules have no written-in words, and the re-worded one has its own").toBeGreaterThanOrEqual(2);
    expect(hard.sentences.some((p) => p.includes("planted words 7f31")), hard.sentences.join("\n")).toBe(true);
  });

  it("the judge fails a thing with no Rules section, rows outside it, and an operation page that drops one of its own refusals", { timeout: 120_000 }, async () => {
    const built = await build(AS_THEY_STAND);
    const judged = async (change: (html: string) => string) => {
      const dir = mkdtempSync(join(tmpdir(), "rules-broken-"));
      dirs.push(dir);
      writeFileSync(join(dir, "index.html"), change(standIn(false)));
      const portal = await ServedPortals.open({ context: context(built), clientDir: dir, server: standInServer, run });
      try { return await judge(portal, built.wire, built.rules); } finally { await portal.close(); }
    };
    expect((await judged((h) => h)).section, "the reference page, to start from").toEqual([]);
    const noSection = await judged((h) => h.replace(`'<section data-portal="rules">'`, `'<section>'`));
    expect(noSection.section.some((p) => p.includes("has 0 Rules sections")), noSection.section.join("\n")).toBe(true);
    const twice = await judged((h) => h.replace("rules.map(([n, r]) =>", "rules.concat(rules).map(([n, r]) =>"));
    expect(twice.section.some((p) => p.includes("2 times")), twice.section.join("\n")).toBe(true);
    const twoCommits = await judged((h) => h.replace(`+ '<div data-portal="spine-stop" data-stop="commit">commit</div>'`, `+ '<div data-portal="spine-stop" data-stop="commit">commit</div><div data-portal="spine-stop" data-stop="commit">commit</div>'`));
    expect(twoCommits.spine.some((p) => p.includes("more than once")), twoCommits.spine.join("\n")).toBe(true);
    const noLifecycle = await judged((h) => h.replace(`'<div data-portal="lifecycle">'`, `'<div>'`));
    expect(noLifecycle.section.some((p) => p.includes("has a machine and no")), noLifecycle.section.join("\n")).toBe(true);
    const outside = await judged((h) => h.replace(`'<section data-portal="rules">' + "<h2>Rules</h2>" + rules.map(`, `'<section data-portal="rules"></section>' + rules.map(`));
    expect(outside.section.some((p) => p.includes("outside the Rules section")), outside.section.join("\n")).toBe(true);
    const dropped = await judged((h) => h.replace("o.refusals.map((e) =>", `o.refusals.filter((e) => e !== "HandleAlreadyOwned").map((e) =>`));
    expect(dropped.refusals.some((p) => p.includes("/portal/operations/handle.claim") && p.includes("HandleAlreadyOwned") && p.includes("is shown 0 times")), dropped.refusals.join("\n")).toBe(true);
  });

  it("the judge names a plain-text refusal, a missing link and a rules stop out of place", { timeout: 120_000 }, async () => {
    const built = await build(AS_THEY_STAND);
    const dir = mkdtempSync(join(tmpdir(), "rules-broken-"));
    dirs.push(dir);
    writeFileSync(join(dir, "index.html"), standIn(false).replace('<a data-portal="rule-link"', '<a data-x="1"').replace(`'<span data-portal="refusal" data-refusal="'`, `'<span data-refusal="'`).replace("data-stop=\"rules\"", "data-stop=\"commit\""));
    const portal = await ServedPortals.open({ context: context(built), clientDir: dir, server: standInServer, run });
    const found = await judge(portal, built.wire, built.rules);
    await portal.close();
    expect(found.refusals.some((p) => p.includes("plain text")), found.refusals.join("\n")).toBe(true);
    expect(found.spine.length, found.spine.join("\n")).toBeGreaterThan(0);
  });
});

describe.each([
  ["Plugged In's rules as they stand (three one-line unique rules)", AS_THEY_STAND, true],
  ["the same rules renamed and re-worded in the wire, with a `breaks` the compiler never made: nothing is written in", PLANTED, false],
] as ReadonlyArray<readonly [string, Naming, boolean]>)("28 ST1.22: %s", (_, naming, keep) => {
  const built = build(naming);
  const said = async (group: keyof Verdicts) => (await verdicts(async () => real(await built), await built))[group];

  it("a thing's page has a Rules section under its lifecycle, one row per rule of the model and none for a thing with no rules", { timeout: 300_000 }, async () => {
    expect(await said("section")).toEqual([]);
  });

  it("the compiler's own `breaks` on the wire, through this variant's names, is the list the fixture states: no drift between the compiler and the fixture", async () => {
    const { compiled, truth } = await built;
    expect(compiled, "the wire carries no `breaks` on every operation: the compiler's model drops it (S-31)").not.toBeNull();
    expect(compiled).toEqual(truth);
  });

  it("each rule says one sentence, generated from its model or its own description verbatim", { timeout: 300_000 }, async () => {
    expect(await said("sentences")).toEqual([]);
  });

  it("every refusal a rule owns reads as that sentence and links to its rule's row, on every page that shows one", { timeout: 300_000 }, async () => {
    expect(await said("refusals")).toEqual([]);
  });

  it("handle.claim's spine has a rules stop between the move and the commit listing every rule the wire's `breaks` says it can break, the page rule with its sentence and its link and no refusal; an operation that breaks none has no stop and no spine-rule", { timeout: 300_000 }, async () => {
    expect(await said("spine")).toEqual([]);
  });
});

// One control for every uniqueness or resolution the judge asks of the page: each plants the one fault in a page that is otherwise right (the
// reference page passes the judge, in the control above), and the judge must name it, in its own group.
const SPINE_RULES = `data-rules="' + rules.join(",")`;
describe.each([
  ["a second Rules section", "section", "2 Rules sections", [[`"</section>" : "")`, `"</section><section data-portal=\\"rules\\"></section>" : "")`]]],
  ["a rule's row shown twice", "section", "2 times", [["rules.map(([n, r]) =>", "rules.concat(rules).map(([n, r]) =>"]]],
  ["two rows sharing one id", "section", "is on 2 elements", [[`id="rule-' + n + '"`, `id="rule-x"`]]],
  ["a second lifecycle", "section", "2 lifecycles", [[`'<div data-portal="lifecycle">' + t.machine.states.join(" > ") + "</div>"`, `'<div data-portal="lifecycle">' + t.machine.states.join(" > ") + '</div><div data-portal="lifecycle"></div>'`]]],
  ["a row with two sentences", "sentences", "2 `rule-sentence`", [[`"</i>" + (r.refuse`, `"</i><i data-portal=\\"rule-sentence\\">x</i>" + (r.refuse`]]],
  ["a link to another rule's row", "refusals", "not exactly its rule's row", [[`'#rule-' + n`, `'#rule-' + (n === "oneHolderPerName" ? "oneNamePerPerson" : n)`]]],
  ["a link whose fragment two elements answer to", "refusals", "is 2 elements", [[`id="rule-' + n + '"`, `id="rule-x"`], [`'#rule-' + n`, `'#rule-x'`]]],
  ["a refusal with two sentences", "refusals", "2 `refusal-sentence`", [[`'</i> <a data-portal="rule-link"`, `'</i><i data-portal="refusal-sentence">z</i> <a data-portal="rule-link"`]]],
  ["a refusal with two links", "refusals", "2 `rule-link`", [[`'">' + n + '</a></span>'`, `'">' + n + '</a><a data-portal="rule-link" href="/x">r</a></span>'`]]],
  ["a refusal listed twice on its operation's page", "refusals", "is shown 2 times", [["o.refusals.map((e) =>", "o.refusals.concat(o.refusals).map((e) =>"]]],
  ["a refusal its operation does not have", "refusals", "not one of its refusals", [["o.refusals.map((e) =>", `o.refusals.concat(["HandleNotClaimed"]).map((e) =>`], [`return "<span>" + esc(e) + "</span>";`, `return '<span data-portal="refusal" data-refusal="' + e + '" data-rule="">' + esc(e) + "</span>";`]]],
  ["a rules stop naming a rule twice", "spine", "names a rule twice", [[SPINE_RULES, `data-rules="' + rules.concat(rules).join(",")`]]],
  // S-31: the stop lists `breaks`. Each plant is a portal that is wrong in one way the old stop (`invariants` only) or a lazy one could be.
  ["a stop built from the refusals only (the portal before S-31)", "spine", "the model says it breaks", [[`rules = [...new Set(o.breaks ?? [])]`, `rules = [...new Set(Object.values(o.invariants ?? {}))]`]]],
  ["a stop that leaves out the rules with no refusal", "spine", "is not what a person reads", [[`rules.map(stopRule).join("")`, `rules.filter((x) => m.things[x.split(".")[0]].invariants[x.split(".")[1]].refuse).map(stopRule).join("")`]]],
  ["every rule of every thing on every operation", "spine", "can break no rule", [[`rules = [...new Set(o.breaks ?? [])]`, `rules = Object.entries(m.things).flatMap(([t, th]) => Object.keys(th.invariants ?? {}).map((n) => t + "." + n))`]]],
  ["every rule of the operation's own thing", "spine", "can break no rule", [[`rules = [...new Set(o.breaks ?? [])]`, `rules = Object.keys(m.things[o.thing].invariants ?? {}).map((n) => o.thing + "." + n)`]]],
  ["a rule listed twice in the stop", "spine", "one each", [[`rules.map(stopRule).join("")`, `rules.map((x) => stopRule(x) + stopRule(x)).join("")`]]],
  ["a rule's entry in the stop hidden", "spine", "one each", [[`'<div data-portal="spine-rule"`, `'<div style="display:none" data-portal="spine-rule"`]]],
  ["a rule's entry in the stop with no sentence element", "spine", "spine-rule-sentence", [[`<i data-portal="spine-rule-sentence">`, `<i>`]]],
  ["a rule's entry in the stop with a sentence of its own", "spine", "one sentence on every surface", [[`esc(sentence(t, n, r))`, `esc(r.refuse ? sentence(t, n, r) : "see the rule")`]]],
  ["a rule's entry in the stop with no link", "spine", "needs one", [[`<a data-portal="rule-link" data-in="stop"`, `<a data-in="stop"`]]],
  ["a rule's entry in the stop that names the wrong rule", "spine", "does not name", [[`'">' + n + '</a>' + (r.refuse`, `'">rule</a>' + (r.refuse`]]],
  ["a rule's entry in the stop linking to another rule's row", "spine", "not to exactly its row", [[`'#rule-' + n + '">' + n + '</a>' + (r.refuse`, `(r.refuse ? '#rule-' + n : '#rule-oneHolderPerName') + '">' + n + '</a>' + (r.refuse`]]],
  ["a rule's entry in the stop linking outside the portal", "spine", "not to exactly its row", [[`data-in="stop" href="/portal/things/`, `data-in="stop" href="https://wrong.example/portal/things/`]]],
  ["a refusal in the entry of a rule that owns none", "spine", "which owns none", [[`(r.refuse ? " " + view(o, r.refuse) : "") + "</div>"`, `(r.refuse ? " " + view(o, r.refuse) : '<span data-portal="refusal" data-refusal="Phantom" data-rule="">Phantom</span>') + "</div>"`]]],
  ["an entry that sits outside the rules stop", "spine", "outside the rules stop", [[`'">rules: ' + rules.map(stopRule).join("") + '</div>'`, `'">rules</div>' + rules.map(stopRule).join("")`]]],
  // the five proofs' other ways (SKILL.md, proof 5), one planted fault each
  ["a sentence right for one rule and wrong for another", "sentences", "does not carry", [[`r.fields.join(' and '))`, `(thing === 'profile' ? 'x' : r.fields.join(' and ')))`]]],
  ["a scope wider than the model's", "section", `while "claimed,released"`, [[`'" data-while="' + r.while.join(",")`, `'" data-while="' + r.while.concat(["released"]).join(",")`]]],
  ["a rule's row left out", "section", "lists rules", [["rules.map(([n, r]) =>", "rules.slice(1).map(([n, r]) =>"]]],
  ["a refusal's sentence left out", "refusals", "0 `refusal-sentence`", [[`<i data-portal="refusal-sentence">`, `<i>`]]],
  ["a row for a rule the model does not have", "section", "lists rules", [["rules.map(([n, r]) =>", `rules.concat([["ghost", { fields: ["x"], while: [] }]]).map(([n, r]) =>`]]],
  ["a rules stop on an operation that can break no rule", "spine", "can break no rule", [["(rules.length ? '<div data-portal=\"spine-stop\" data-stop=\"rules\"", "(true ? '<div data-portal=\"spine-stop\" data-stop=\"rules\""]]],
  ["a missing attribute read as null", "section", `refuses "undefined"`, [[`(r.refuse ?? "")`, `String(r.refuse)`]]],
  ["a missing description printed as a sentence", "sentences", "does not carry", [[`r.description ?? (`, `(r.description ? r.description : r.refuse ? "undefined" : `]]],
  ["a Rules section on a thing with no rules", "section", "declares no rule", [[`(rules.length ? '<section data-portal="rules">'`, `(rules.length || name === "link" ? '<section data-portal="rules">'`]]],
  ["a row with no id", "section", "has no id", [[`id="rule-' + n + '"`, ``]]],
  ["a link to a fragment nothing answers to", "refusals", "is 0 elements", [[`'#rule-' + n`, `'#rule-nowhere'`]]],
  ["the rules before the lifecycle", "section", "before the lifecycle", [[`+ (t.machine ? '<div data-portal="lifecycle">' + t.machine.states.join(" > ") + "</div>" : "")`, ``], [`+ "</p>").join("");`, `+ "</p>").join("") + (t.machine ? '<div data-portal="lifecycle">x</div>' : "");`]]],
  ["the rules after the operations", "section", "after the operations", [[`+ (rules.length ? '<section data-portal="rules">'`, `+ Object.values(m.operations).filter((o) => o.thing === name).map((o) => '<div data-portal="operation-row" data-operation="' + o.name + '">' + o.name + "</div>").join("") + (rules.length ? '<section data-portal="rules">'`]]],
  ["a generated sentence repeating another rule's description", "sentences", "repeats another rule's description", [[`' holds this '`, `' holds this you already hold a name '`]]],
  // an attribute says it, the page does not (and a link that leaves the portal)
  ["a rules stop with data-rules and no names", "spine", "is not what a person reads", [[`'">rules: ' + rules.map(stopRule).join("") + '</div>'`, `'">rules</div>'`]]],
  ["a rules stop that shows only one of its rules", "spine", "is not what a person reads", [[`rules.map(stopRule).join("")`, `rules.slice(1).map(stopRule).join("")`]]],
  ["a commit stop that says something else", "spine", "not commit", [[`data-stop="commit">commit</div>'`, `data-stop="commit">done</div>'`]]],
  ["a row whose data-rule is not shown by name", "section", "does not show its name", [[`'"><b>' + n + '</b> <i data-portal="rule-sentence">'`, `'"><b></b> <i data-portal="rule-sentence">'`]]],
  ["a row whose data-refuse is not shown", "section", "does not show it", [[`(r.refuse ? " refuses " + view({ invariants: { [r.refuse]: name + "." + n } }, r.refuse) : "")`, `""`]]],
  ["a refusal whose data-refusal is not shown", "refusals", "the page does not show it", [[`'"><b>' + e + '</b> <i data-portal="refusal-sentence">'`, `'"><b></b> <i data-portal="refusal-sentence">'`]]],
  ["a link that does not name its rule", "refusals", "does not name its rule", [[`'">' + n + '</a></span>'`, `'">rule</a></span>'`]]],
  ["a lifecycle that shows none of its states", "section", "does not show the state", [[`t.machine.states.join(" > ")`, `"x"`]]],
  ["a Rules section with no title", "section", "does not say Rules", [[`"<h2>Rules</h2>" + `, ``]]],
  ["a sentence that omits the states its data-while carries", "sentences", "does not carry", [[`r.while.join(' or ')`, `''`]]],
  ["a link that leaves the portal", "refusals", "leaves the portal", [[`href="/portal/things/'`, `href="https://wrong.example/portal/things/'`]]],
  // visibility: every element the judge counts must be visible
  ["a rule's row hidden with display:none", "section", "lists rules", [[`'<div data-portal="rule" id=`, `'<div style="display:none" data-portal="rule" id=`]]],
  ["the Rules section hidden", "section", "0 Rules sections", [[`'<section data-portal="rules">'`, `'<section hidden data-portal="rules">'`]]],
  ["a rule's sentence hidden", "sentences", "does not carry", [[`<i data-portal="rule-sentence">`, `<i style="visibility:hidden" data-portal="rule-sentence">`]]],
  ["a refusal hidden from the page (aria-hidden)", "refusals", "is shown 0 times", [[`'<span data-portal="refusal" data-refusal="'`, `'<span aria-hidden="true" data-portal="refusal" data-refusal="'`]]],
  ["a rule link at opacity 0", "refusals", "0 `rule-link`", [[`<a data-portal="rule-link"`, `<a style="opacity:0" data-portal="rule-link"`]]],
  ["the lifecycle hidden", "section", "has a machine and no", [[`'<div data-portal="lifecycle">'`, `'<div hidden data-portal="lifecycle">'`]]],
  ["the rules stop hidden", "spine", "the spine has no", [[`'<div data-portal="spine-stop" data-stop="rules"`, `'<div style="display:none" data-portal="spine-stop" data-stop="rules"`]]],
  // proof 5, a plant the stop's own checks never saw: `spine-rule` entries on an operation that breaks no rule, outside any stop (the judge used to `continue` before it looked)
  ["stray spine-rules on an operation that breaks none", "spine", "handle.release: a `spine-rule` outside the rules stop", [[`+ '<div data-portal="spine-stop" data-stop="commit">commit</div>';`, `+ '<div data-portal="spine-stop" data-stop="commit">commit</div>' + (o.name === "handle.release" ? '<div data-portal="spine-rule" data-rule="handle.oneHolderPerName"><b>x</b></div>' : "");`]]],
  ["stray spine-rules naming a rule the operation does not break, in a stop it does not have", "spine", "handle.release: the rules stop has a `[data-portal=\"spine-rule\"]` for [handle.oneHolderPerName]", [[`+ '<div data-portal="spine-stop" data-stop="commit">commit</div>';`, `+ '<div data-portal="spine-stop" data-stop="commit">commit</div>' + (o.name === "handle.release" ? '<div data-portal="spine-stop" data-stop="rules"><div data-portal="spine-rule" data-rule="handle.oneHolderPerName"><b>x</b></div></div>' : "");`]]],
  ["a spine stop twice", "spine", "more than once", [[`+ '<div data-portal="spine-stop" data-stop="commit">commit</div>'`, `+ '<div data-portal="spine-stop" data-stop="commit">commit</div><div data-portal="spine-stop" data-stop="commit">commit</div>'`]]],
] as ReadonlyArray<readonly [string, keyof Verdicts, string, ReadonlyArray<readonly [string, string]>]>)("28 control: the judge asks for exactly one", (_, group, said, changes) => {
  it(`names ${_}`, { timeout: 120_000 }, async () => {
    const found = (await judgedWith(changes))[group];
    expect(found.some((p) => p.includes(said)), `${said}\n${found.join("\n")}`).toBe(true);
  });
});

// The renamed variant's `breaks` is not the compiler's (`PLANTED_BREAKS`), so a portal that guesses the list instead of reading it is refused there, though it can match the real one.
describe.each([
  ["a stop that is the real list written in (claim: every rule of handle and profile, the rest: none)", `rules = [...new Set(o.breaks ?? [])]`, `rules = o.name === "handle.claim" ? ["handle", "profile"].flatMap((t) => Object.keys(m.things[t].invariants ?? {}).map((n) => t + "." + n)) : []`],
  ["a stop shown only for an operation that has refusals", `rules = [...new Set(o.breaks ?? [])]`, `rules = Object.keys(o.invariants ?? {}).length ? [...new Set(o.breaks ?? [])] : []`],
  ["a stop that lists only the rules that refuse", `rules = [...new Set(o.breaks ?? [])]`, `rules = [...new Set(o.breaks ?? [])].filter((x) => m.things[x.split(".")[0]].invariants[x.split(".")[1]].refuse)`],
  ["a stop that adds the page rule wherever a rule refuses", `rules = [...new Set(o.breaks ?? [])]`, `rules = [...new Set([...(o.breaks ?? []), ...(Object.keys(o.invariants ?? {}).length ? ["profile." + Object.keys(m.things.profile.invariants)[0]] : [])])]`],
] as ReadonlyArray<readonly [string, string, string]>)("28 control: a portal that ignores `breaks` is refused once the wire plants one", (_, from, to) => {
  it(`is refused by the planted list: ${_}`, { timeout: 120_000 }, async () => {
    const planted = await judgedWith([[from, to]], PLANTED);
    expect(planted.spine.length, `planted:\n${planted.spine.join("\n")}`).toBeGreaterThan(0);
  });
});

describe("28 S-31: the generated model and the portal's wire say the same", () => {
  it("every operation's `breaks` in generated/model/model.json is the one in generated/portal/blueprint.json, and the lists are the compiler's (each rule once)", () => {
    const model = JSON.parse(readFileSync(join(repo, "examples/plugged-in/generated/model/model.json"), "utf8")) as { operations: Record<string, { breaks?: unknown }> };
    const wire = (pluggedIn as { model: { operations: Record<string, { breaks?: unknown }> } }).model.operations;
    expect(Object.keys(model.operations).sort()).toEqual(Object.keys(wire).sort());
    for (const [name, op] of Object.entries(model.operations)) {
      expect(Array.isArray(op.breaks), `${name}: generated/model/model.json carries no \`breaks\` (the compiler's model drops it, S-31)`).toBe(true);
      expect(wire[name]?.breaks, name).toEqual(op.breaks);
      expect(new Set(op.breaks as Array<string>).size, `${name} names a rule twice`).toBe((op.breaks as Array<string>).length);
    }
  });
});

describe("28 control: the judge's expected values come from the model, not from the page", () => {
  it("a page that serves one wire, judged against another, is refused", { timeout: 120_000 }, async () => {
    const served = await build(PLANTED);
    const expected = await build(AS_THEY_STAND);
    const portal = await ServedPortals.open({ context: context(served), clientDir: clientDir(false), server: standInServer, run });
    try {
      const found = await judge(portal, expected.wire, expected.rules);
      expect(found.section.length + found.sentences.length, "the page's own names and words are not the model's").toBeGreaterThan(0);
    } finally { await portal.close(); }
  });
});
