// The invariant row's docs, mcp, portal and telemetry evals: Plugged In as ST1.19 leaves it, and a wrong output planted for each thing an eval reads. The pages of the portal are
// drawn by hand from the model (`testing.ts`) in the hooks check 28 reads, because the portal draws no Rules section until ST1.22.
import { describe, expect, it } from "vitest";
import { editSpans, judge } from "../project-evidence/testing.ts";
import { InvariantEvals } from "./service.ts";
import { portalPages, standIn, withModel, withOperation, withPage, withRule, withText } from "./testing.ts";

const pluggedIn = await standIn();
const check = (cell: string, subject: string, e = pluggedIn) => judge(InvariantEvals.evals, `invariant.${cell}`, subject, e);
const why = (cell: string, subject: string, e = pluggedIn) => { const found = check(cell, subject, e); return found.ok ? [] : found.why; };
const has = (lines: ReadonlyArray<string>, text: string | RegExp) => lines.some((l) => (typeof text === "string" ? l.includes(text) : text.test(l)));
const T = "handle.oneHolderPerName";
const O = "handle.oneNamePerPerson";
const P = "profile.onePagePerHandle";

describe("invariant.docs: the Invariants section and the refusals table", () => {
  const thing = "generated/docs/handle/index.md";
  const claim = "generated/docs/handle/claim.md";
  it("no Invariants section, no bullet for the rule, and a rule written twice", () => {
    expect(has(why("docs", T, withText(pluggedIn, thing, "## Invariants", "## Rules")), "has no Invariants section")).toBe(true);
    expect(has(why("docs", T, withText(pluggedIn, thing, "`handle.oneHolderPerName`:", "`handle.oneHolderPerNameX`:")), "no bullet for handle.oneHolderPerName")).toBe(true);
    expect(has(why("docs", T, withText(pluggedIn, thing, /(- `handle.oneHolderPerName`:[^\n]*\n)/, "$1$1")), "2 bullets for handle.oneHolderPerName")).toBe(true);
  });
  it("a bullet that is right for one rule and wrong for another: a described rule's words changed, a generated sentence that leaves out the state or the field", () => {
    expect(has(why("docs", O, withText(pluggedIn, thing, "you already hold a name.", "you hold too many names.")), "the rule's description is \"you already hold a name\"")).toBe(true);
    expect(has(why("docs", T, withText(pluggedIn, thing, "another claimed handle holds this name.", "another handle holds this name.")), "does not name claimed")).toBe(true);
    expect(has(why("docs", T, withText(pluggedIn, thing, "another claimed handle holds this name.", "another claimed handle holds one.")), "does not name name")).toBe(true);
    expect(has(why("docs", P, withText(pluggedIn, "generated/docs/profile/index.md", "another profile holds this handle.", "you already hold a name.")), "is handle.oneNamePerPerson's description")).toBe(true);
  });
  it("a bullet that leaves out the key, the scope or the refusal, or names another rule's refusal", () => {
    expect(has(why("docs", T, withText(pluggedIn, thing, "Unique on name, while claimed; refused HandleTaken.", "Unique on name, while claimed.")), "does not say it refuses HandleTaken")).toBe(true);
    expect(has(why("docs", T, withText(pluggedIn, thing, "Unique on name, while claimed; refused HandleTaken.", "Unique on owner, while claimed; refused HandleTaken.")), "does not name its key field name")).toBe(true);
    expect(has(why("docs", O, withText(pluggedIn, thing, "Unique on owner, while claimed; refused HandleAlreadyOwned.", "Unique on name, while claimed; refused HandleAlreadyOwned.")), "does not name its key field owner")).toBe(true);
    expect(has(why("docs", T, withText(pluggedIn, thing, "Unique on name, while claimed; refused HandleTaken.", "Unique on name; refused HandleTaken.")), "does not say it holds while claimed")).toBe(true);
    expect(has(why("docs", T, withText(pluggedIn, thing, "refused HandleTaken.", "refused HandleTaken and HandleAlreadyOwned.")), "names HandleAlreadyOwned, which it does not refuse")).toBe(true);
  });
  it("a rule that refuses nothing, said to refuse something or not said to refuse nothing", () => {
    expect(has(why("docs", P, withText(pluggedIn, "generated/docs/profile/index.md", "refuses nothing, a break is a defect.", "refuses it.")), "does not say the rule refuses nothing")).toBe(true);
  });
  it("a Refusals row that is missing, has the wrong sentence, does not say which rule, or is there twice", () => {
    expect(has(why("docs", T, withText(pluggedIn, claim, /\| HandleTaken \|[^\n]*\n/, "")), "0 Refusals rows for HandleTaken")).toBe(true);
    expect(has(why("docs", O, withText(pluggedIn, claim, "you already hold a name; by the rule", "you may not; by the rule")), "the rule's description is")).toBe(true);
    expect(has(why("docs", T, withText(pluggedIn, claim, "; by the rule handle.oneHolderPerName", "")), 'does not say "by the rule handle.oneHolderPerName"')).toBe(true);
    expect(has(why("docs", T, withText(pluggedIn, claim, "; by the rule handle.oneHolderPerName", "; by the rule handle.oneNamePerPerson")), 'does not say "by the rule handle.oneHolderPerName"')).toBe(true);
    expect(has(why("docs", T, withText(pluggedIn, claim, /(\| HandleTaken \|[^\n]*\n)/, "$1$1")), "2 Refusals rows for HandleTaken")).toBe(true);
  });
});

describe("invariant.mcp: the tool's sentence", () => {
  const tool = (description: string) => ({ ...pluggedIn, mcp: pluggedIn.mcp!.map((t) => (t.name === "handle.claim" ? { ...t, description } : t)) });
  const said = pluggedIn.mcp!.find((t) => t.name === "handle.claim")!.description!;
  it("no tools, a tool that does not exist, and a tool with no sentence for the refusal", () => {
    expect(has(why("mcp", T, { ...pluggedIn, mcp: undefined }), "tools/list could not be read")).toBe(true);
    expect(has(why("mcp", T, { ...pluggedIn, mcp: pluggedIn.mcp!.filter((t) => t.name !== "handle.claim") }), "tools/list has no tool handle.claim")).toBe(true);
    expect(has(why("mcp", T, tool("Claim a free name.")), "has 0 sentences for HandleTaken")).toBe(true);
  });
  it("a sentence that is right for one rule and wrong for another", () => {
    expect(has(why("mcp", O, tool(said.replace("you already hold a name", "you hold too many"))), "the rule's description is")).toBe(true);
    expect(has(why("mcp", T, tool(said.replace("another claimed handle holds this name", "someone else has it"))), "does not name")).toBe(true);
    expect(why("mcp", T, tool(said.replace("another claimed handle holds this name", "another claimed handle has this name")))).toEqual(
      expect.arrayContaining([expect.stringContaining("the docs say")]));
  });
  it("a sentence said twice, and a sentence on a tool no rule can break", () => {
    expect(has(why("mcp", T, tool(`${said} Refuses HandleTaken when another claimed handle holds this name.`)), "has 2 sentences for HandleTaken")).toBe(true);
    const other = { ...pluggedIn, mcp: pluggedIn.mcp!.map((t) => (t.name === "handle.release" ? { ...t, description: `${t.description} Refuses HandleTaken when another claimed handle holds this name.` } : t)) };
    expect(has(why("mcp", T, other), "handle.release says it refuses HandleTaken")).toBe(true);
  });
  it("a rule that refuses nothing adds no sentence to a tool", () => {
    const named = { ...pluggedIn, mcp: pluggedIn.mcp!.map((t) => (t.name === "profile.get" ? { ...t, description: `${t.description} Refuses nothing when profile.onePagePerHandle breaks.` } : t)) };
    expect(has(why("mcp", P, named), "says something of profile.onePagePerHandle")).toBe(true);
  });
});

describe("invariant.portal: the Rules section, the refusal's link and the spine stop", () => {
  const thing = "/portal/things/handle";
  const claim = "/portal/operations/handle.claim";
  it("no page, no Rules section, two sections, a rule written twice", () => {
    expect(has(why("portal", T, { ...pluggedIn, portal: {} }), "could not be rendered")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, thing, 'data-portal="rules"', 'data-portal="rulez"')), "has 0 Rules sections")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, thing, "</section>", '</section><section data-portal="rules"></section>')), "has 2 Rules sections")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, thing, /(<li data-portal="rule" id="rule-oneHolderPerName".*?<\/li>)/, "$1$1")), "2 rows for handle.oneHolderPerName")).toBe(true);
  });
  it("a row that says another key, another scope, another refusal, has no id, shares an id, or has two sentences or none", () => {
    expect(has(why("portal", T, withPage(pluggedIn, thing, 'data-fields="name"', 'data-fields="owner"')), 'data-fields is "owner"')).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, thing, 'data-while="claimed" data-refuse="HandleTaken"', 'data-while="claimed,released" data-refuse="HandleTaken"')), 'data-while is "claimed,released"')).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, thing, 'data-refuse="HandleTaken"', 'data-refuse=""')), 'data-refuse is ""')).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, thing, ' id="rule-oneHolderPerName"', "")), "the row has no id")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, thing, ' id="rule-oneNamePerPerson"', ' id="rule-oneHolderPerName"')), "is on more than one element")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, thing, /<span data-portal="rule-sentence">another[^<]*<\/span>/, "")), "has 0 sentences")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, thing, /(<span data-portal="rule-sentence">another[^<]*<\/span>)/, "$1$1")), "has 2 sentences")).toBe(true);
  });
  it("a sentence that is not the rule's own words: a described rule's words changed, a generated one that leaves out the state", () => {
    expect(has(why("portal", O, withPage(pluggedIn, thing, "you already hold a name", "no")), "the rule's description is")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, thing, "another claimed handle holds this name", "another handle holds this name")), "does not name claimed")).toBe(true);
  });
  it("a row's neighbour does not lend it a sentence", () => {
    const only = withPage(pluggedIn, thing, /<span data-portal="rule-sentence">another claimed[^<]*<\/span>/, "");
    expect(has(why("portal", T, only), "has 0 sentences")).toBe(true);
    expect(why("portal", O, only)).toEqual([]);
  });
  it("a refusal on the operation's page that is missing, says another rule, has no link, links elsewhere, has no sentence or the wrong one", () => {
    expect(has(why("portal", T, withPage(pluggedIn, claim, 'data-refusal="HandleTaken"', 'data-refusal="HandleGone"')), "shows HandleTaken 0 times")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, claim, 'data-refusal="HandleTaken" data-rule="handle.oneHolderPerName"', 'data-refusal="HandleTaken" data-rule="handle.oneNamePerPerson"')), "shows HandleTaken 0 times")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, claim, 'data-portal="rule-link"', 'data-portal="link"')), "has 0 links to its rule")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, claim, 'href="/portal/things/handle#rule-oneHolderPerName"', 'href="/portal/things/handle#rule-oneNamePerPerson"')), "not to the rule's row")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, claim, 'href="/portal/things/handle#rule-oneHolderPerName"', 'href="/portal/things/link#rule-oneHolderPerName"')), "not to the rule's row")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, claim, /<span data-portal="refusal-sentence">another[^<]*<\/span>/, "")), "has 0 sentences")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, claim, "another claimed handle holds this name", "taken")), "does not name")).toBe(true);
  });
  it("a spine with no rules stop, one out of place, one naming another rule, or two", () => {
    expect(has(why("portal", T, withPage(pluggedIn, claim, /<li data-portal="spine-stop" data-stop="rules"[^>]*>rules<\/li>/, "")), "needs one rules stop between move and commit")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, claim, /<ol>.*<\/ol>/, '<ol><li data-portal="spine-stop" data-stop="rules" data-rules="handle.oneHolderPerName">rules</li><li data-portal="spine-stop" data-stop="move">move</li><li data-portal="spine-stop" data-stop="commit">commit</li></ol>')), "needs one rules stop")).toBe(true);
    expect(has(why("portal", T, withPage(pluggedIn, claim, 'data-rules="handle.oneHolderPerName,handle.oneNamePerPerson"', 'data-rules="handle.oneNamePerPerson"')), "the model says the operation can break handle.oneHolderPerName, handle.oneNamePerPerson")).toBe(true);
  });
  it("the rules stop names what the model's breaks says, a rule that refuses nothing included, and no other", () => {
    const breaking = withOperation(pluggedIn, "handle.claim", (o) => ({ ...o, breaks: [T, O, P] }));
    const drawn = { ...breaking, portal: portalPages(breaking.model) };
    expect(why("portal", T, drawn)).toEqual([]);
    expect(why("portal", O, drawn)).toEqual([]);
    expect(has(why("portal", T, withPage(drawn, claim, `data-rules="${T},${O},${P}"`, `data-rules="${T},${O}"`)), `the model says the operation can break ${[T, O, P].sort().join(", ")}`)).toBe(true);
    expect(has(why("portal", T, withPage(drawn, claim, `data-rules="${T},${O},${P}"`, `data-rules="${T},${O},${P},handle.bogus"`)), "the model says the operation can break")).toBe(true);
    expect(has(why("portal", T, { ...drawn, portal: portalPages(pluggedIn.model) }), "the model says the operation can break")).toBe(true);
  });
  it("a rule that refuses nothing needs only its row", () => {
    expect(why("portal", P)).toEqual([]);
    expect(has(why("portal", P, withPage(pluggedIn, "/portal/things/profile", 'data-refuse=""', 'data-refuse="X"')), 'data-refuse is "X"')).toBe(true);
  });
});

describe("invariant.telemetry: the refused span", () => {
  const refused = (name: string) => (s: { readonly attrs: Readonly<Record<string, unknown>> }) => s.attrs["refusal"] === name;
  const change = (name: string, attrs: Readonly<Record<string, unknown>>) => editSpans(pluggedIn, (spans) => spans.map((s) => (refused(name)(s) ? { ...s, attrs: { ...s.attrs, ...attrs } } : s)));
  it("no spans at all, and no span for the refusal", () => {
    expect(has(why("telemetry", T, { ...pluggedIn, spans: undefined }), "no spans were read")).toBe(true);
    expect(has(why("telemetry", T, editSpans(pluggedIn, (spans) => spans.filter((s) => !refused("HandleTaken")(s)))), "no span has refusal=HandleTaken")).toBe(true);
  });
  it("a refused span without the rule, with another rule's, or with its code or its deciding line wrong, on the first call or on any later one", () => {
    const attrs = (key: string, value: unknown) => change("HandleTaken", { [key]: value });
    expect(has(why("telemetry", T, attrs("refusal.invariant", undefined)), "refusal.invariant none")).toBe(true);
    expect(has(why("telemetry", T, attrs("refusal.invariant", "handle.oneNamePerPerson")), "expected handle.oneHolderPerName")).toBe(true);
    expect(has(why("telemetry", T, attrs("refusal.code", "HN-009")), "refusal.code HN-009")).toBe(true);
    expect(has(why("telemetry", T, attrs("refusal.log", "a claimed handle already holds this name")), "the runtime writes it, not the handler")).toBe(true);
    expect(has(why("telemetry", T, attrs("refusal.log", undefined)), "deciding log line")).toBe(true);
    const second = editSpans(pluggedIn, (spans) => [...spans, { name: "handle.claim", attrs: { operation: "handle.claim", refusal: "HandleTaken", "refusal.code": "HN-001" } }]);
    expect(has(why("telemetry", T, second), "expected handle.oneHolderPerName")).toBe(true);
  });
  it("a span that names the rule and refuses something else", () => {
    const wrong = editSpans(pluggedIn, (spans) => [...spans, { name: "handle.claim", attrs: { refusal: "HandleAlreadyOwned", "refusal.invariant": T, "refusal.code": "HN-002", "refusal.log": T } }]);
    expect(has(why("telemetry", T, wrong), "names handle.oneHolderPerName and refuses HandleAlreadyOwned, not HandleTaken")).toBe(true);
  });
  it("a rule that refuses nothing: green with the run as it is, red when a span names it as refusing", () => {
    expect(why("telemetry", P)).toEqual([]);
    expect(has(why("telemetry", P, editSpans(pluggedIn, (spans) => [...spans, { name: "link.add", attrs: { refusal: "LinkNeedsHandle", "refusal.invariant": P } }])), "a rule that refuses nothing")).toBe(true);
  });
  it("a rule given a refusal of its own: it then needs a span", () => {
    expect(has(why("telemetry", P, withModel(withRule(pluggedIn, "profile", "onePagePerHandle", (x) => ({ ...x, refuse: "ProfileNotFound" })), (m) => m)), "expected profile.onePagePerHandle")).toBe(true);
  });
});
