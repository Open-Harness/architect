// The journey row's evals over Plugged In's real journeys, model and run, and acme's. The same suite runs for every journey the model has.
import { describe, expect, it } from "vitest";
import type { JourneyModel } from "../project-evidence/types.ts";
import { editFile, editPortal, editSpans, evidenceOf, judge } from "../project-evidence/testing.ts";
import { JourneyEvals } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const journeys = (e: typeof pluggedIn) => Object.values(e.model.journeys ?? {}).map((j) => j.name);
const check = (cell: string, subject: string, evidence = pluggedIn) => judge(JourneyEvals.evals, `journey.${cell}`, subject, evidence);

describe("Plugged In, as captured on 19 November 2026 (fixtures/plugged-in)", () => {
  it("has seven journeys", () => {
    expect(journeys(pluggedIn).length).toBe(7);
  });

  it.each(["model", "server"])("journey.%s is green for every journey", (cell) => {
    for (const journey of journeys(pluggedIn)) expect({ journey, ...check(cell, journey) }).toEqual({ journey, ok: true, why: [] });
  });

  it("journey.docs and journey.portal are red: no operation's page shows the journeys that call it as worked examples, and none shows proof", () => {
    for (const journey of journeys(pluggedIn)) {
      expect(check("docs", journey).why.every((w) => /has no "Worked examples" section/.test(w)), journey).toBe(true);
      expect(check("docs", journey).ok, journey).toBe(false);
      expect(check("portal", journey).why.every((w) => /shows no proof from the journey/.test(w)), journey).toBe(true);
      expect(check("portal", journey).ok, journey).toBe(false);
    }
  });

  it("journey.telemetry is red for the journeys with a call the role check refused: that call left no span (handler/service.ts, before the operation's span opens)", () => {
    expect(check("telemetry", "a stranger cannot edit a page").why).toEqual(["its spans cover 4 distinct steps, the journey ran 8"]);
    expect(check("telemetry", "release a handle").why).toEqual(["its spans cover 12 distinct steps, the journey ran 13"]);
    expect(check("telemetry", "claim a handle").ok).toBe(true);
  });
});

describe("acme", () => {
  it("has journeys whose model the eval reads without a run", () => {
    expect(journeys(acme).length).toBeGreaterThan(0);
    for (const journey of journeys(acme)) expect(check("model", journey, acme).why, journey).toEqual(["no prove run was read, so the journey was not seen to run"]);
    for (const journey of journeys(acme)) expect(check("server", journey, acme), journey).toEqual({ ok: true, why: [] });
  });
});

describe("a wrong output is red, and says what", () => {
  const journey = "add, order and remove a link";

  it("a subject the model does not have", () => {
    expect(check("model", "fly to the moon")).toEqual({ ok: false, why: ["the model has no journey fly to the moon"] });
  });

  it("model: a journey prove did not run to the end, a step that failed, and a start that does not exist", () => {
    const partial = { ...pluggedIn, prove: { ...pluggedIn.prove!, journeys: pluggedIn.prove!.journeys.map((j) => (j.name === journey ? { ...j, verdict: "fail", steps: j.steps.slice(1).map((s, i) => (i === 0 ? { ...s, verdict: "fail" } : s)) } : j)) } };
    const why = check("model", journey, partial).why;
    expect(why[0]).toBe("prove reports the journey fail");
    expect(why[1]).toMatch(/^prove ran 11 of its 12 steps$/);
    expect(why[2]).toMatch(/is fail$/);
    const key = Object.keys(pluggedIn.model.journeys!).find((k) => pluggedIn.model.journeys![k]!.name === journey)!;
    const lost = { ...pluggedIn, model: { ...pluggedIn.model, journeys: { ...pluggedIn.model.journeys, [key]: { ...pluggedIn.model.journeys![key]!, starts: "nowhere" } } } };
    expect(check("model", journey, lost).why).toEqual(["it starts in nowhere, which the model has no starting world for"]);
    expect(check("model", journey, { ...pluggedIn, prove: undefined }).why).toEqual(["no prove run was read, so the journey was not seen to run"]);
  });

  it("server: a journey's name in what the server was generated from", () => {
    expect(check("server", journey, editFile(pluggedIn, "generated/server/main.ts", (t) => `${t}\n// ${journey}\n`)).why).toEqual([`generated/server/main.ts names "${journey}": the server carries a journey`]);
  });

  it("portal: passes once each operation the journey calls shows its proof", () => {
    const ops = ["profile.get", "link.add", "link.order", "link.remove"];
    let portal = pluggedIn;
    for (const op of ops) portal = editPortal(portal, `/portal/operations/${op}`, (h) => h.replace("<h2>Contract</h2>", `<h2>Proof</h2><p>${journey}</p><h2>Contract</h2>`));
    expect(check("portal", journey, portal)).toEqual({ ok: true, why: [] });
    // The docs the portal embeds are not its own part: the journey only in the embedded docs is not proof.
    const embedded = editPortal(pluggedIn, "/portal/operations/link.add", (h) => h.replace("</pre>", `${journey}</pre>`));
    expect(check("portal", journey, embedded).why).toContain(`/portal/operations/link.add shows no proof from the journey "${journey}"`);
  });

  it("telemetry: spans under another journey's name, and none", () => {
    expect(check("telemetry", journey, editSpans(pluggedIn, (s) => s.filter((x) => x.name !== `journey.${journey}`))).why).toEqual([`no span named journey.${journey}`]);
    expect(check("telemetry", journey, editSpans(pluggedIn, (s) => s.map((x) => (x.name === `journey.${journey}` ? { ...x, attrs: { ...x.attrs, journey: "another" } } : x)))).why).toEqual([`a journey.${journey} span has journey another`]);
  });
});

// ---- journey.docs (W2): worked examples, in the content the decision holds ----
//
// `worked` writes the good page for every operation from the model's own journeys, in W2's layout (the layout is the builder's; the eval holds the
// content). Each wrong page below changes one thing in it, and the eval must name that thing; the good page, and every other journey's, must pass.

type Model = typeof pluggedIn.model;
const words = (ref: ReadonlyArray<unknown>) => (ref[0] === "world" ? `the world's ${ref.slice(1).join(" ")}` : ref.join(" "));
/** A value as a page says it: a reference in words from its path, a literal by its value, a structure as its parts in order. */
const shown = (value: unknown): string => {
  const ref = typeof value === "object" && value !== null && !Array.isArray(value) ? (value as { ref?: ReadonlyArray<unknown> }).ref : undefined;
  if (ref !== undefined) return words(ref);
  if (Array.isArray(value)) return value.map(shown).filter((t) => t !== "").join(", ");
  if (typeof value === "object" && value !== null) return Object.values(value).map(shown).filter((t) => t !== "").join(", ");
  return value === undefined || value === null ? "" : String(value);
};
/** The refusal a step names, found here without the eval's own helper: a declared or runtime error as it is, the machine's (`link.notFrom`) or the thing's own (`person.notFound`) by the thing. */
const refusalNamed = (model: Model, error: string): string => {
  const [thing, rest] = error.split(".");
  if (rest === "notFrom") return model.things[thing!]!.machine!.notFrom.error;
  if (rest === "notFound") return model.things[thing!]!.notFound!.error;
  return error;
};
/** One step as a bullet, as W2 describes it: title, caller by cast name and kind (a role by its name), the payload with its values and the request key, and what comes back. */
const bullet = (model: Model, journey: JourneyModel, step: JourneyModel["steps"][number]) => {
  const call = step.call!;
  const who = journey.cast![call.actor]!;
  const kind = who.kind === "role" ? `${who.role!.split(".").at(-1)}, as ${who.role}` : who.kind.replace(/-/g, " ");
  const payload = Object.entries(call.payload ?? {}).map(([k, v]) => `${k} ${shown(v)}`).join(", ");
  const key = call.request === undefined ? "" : ` and request key ${call.request}`;
  const refusal = step.checks?.find((c) => c.kind === "refuses");
  const answer = (step.checks ?? []).filter((c) => c.kind === "expect-equal" || c.kind === "expect").map((c) => (c.kind === "expect" ? `something matching \`${c.match}\`` : shown(c.value)));
  const refused = refusal?.error === undefined ? undefined : refusalNamed(model, refusal.error);
  const fields = refusal?.fields !== undefined && shown(refusal.fields) !== "" ? ` (${shown(refusal.fields)})` : "";
  const outcome = refused !== undefined ? `is refused with ${refused}, ${model.refusals[refused]}${fields}` : answer.length > 0 ? `gets back ${answer.join(" and ")}` : "is answered";
  return `- **${step.title}.** ${call.actor} (${kind}) calls with ${payload || "nothing"}${key}, and ${outcome}.`;
};
const entries = (e: typeof pluggedIn, op: string, only?: (title: string) => boolean) => Object.values(e.model.journeys ?? {}).flatMap((journey) => {
  const mine = journey.steps.filter((s) => s.skipped === undefined && s.call?.operation === op && (only === undefined || only(s.title)));
  return mine.length === 0 ? [] : [`### ${journey.name}\n\nStarts from the world \`${journey.starts}\`.\n\n${mine.map((s) => bullet(e.model, journey, s)).join("\n")}\n`];
});
const worked = (e: typeof pluggedIn, change: (page: string, op: string) => string = (page) => page) => Object.values(e.model.operations).reduce((acc, op) => {
  const path = `generated/docs/${op.thing}/${op.verb}.md`;
  return editFile(acc, path, (text) => change(`${text}\n## Worked examples\n\n${entries(acc, op.name).join("\n")}`, op.name));
}, e);
const claimed = "a name is claimed once";
const swap = (from: string | RegExp, to: string) => (page: string, op: string) => (op === "handle.claim" ? page.replace(from, to) : page);

describe("journey.docs holds the worked example's content (W2)", () => {
  it("passes the page written from the model for every journey, and its other journeys' entries do not rescue a wrong one", () => {
    const good = worked(pluggedIn);
    for (const journey of journeys(pluggedIn)) expect({ journey, ...check("docs", journey, good) }).toEqual({ journey, ok: true, why: [] });
  });

  it("names a journey whose entry leaves out one of its steps", () => {
    const why = check("docs", claimed, worked(pluggedIn, swap(/- \*\*a taken name is refused\.\*\*[^\n]*\n/, ""))).why;
    expect(why).toEqual([`generated/docs/handle/claim.md: the entry for "${claimed}" leaves out the step "a taken name is refused"`]);
  });

  it("names a wrong refusal, the other refusal named beside it, and a refusal's code that is left out", () => {
    expect(check("docs", claimed, worked(pluggedIn, swap("HandleTaken, HN-001", "HandleAlreadyOwned, HN-002"))).why.join("\n")).toMatch(/is not shown refused with HandleTaken, HN-001[\s\S]*names HandleAlreadyOwned/);
    expect(check("docs", claimed, worked(pluggedIn, swap("HandleTaken, HN-001", "HandleTaken"))).why[0]).toMatch(/is not shown refused with HandleTaken, HN-001/);
  });

  it("names a step that calls a different operation", () => {
    const why = check("docs", claimed, worked(pluggedIn, swap(/(- \*\*a taken name is refused)/, "- **the name still resolves to aaron's handle.** visitor (anyone) calls with name claimedname.\n$1"))).why;
    expect(why).toEqual([`generated/docs/handle/claim.md: the entry for "${claimed}" lists the step "the name still resolves to aaron's handle", which calls handle.resolve, not handle.claim`]);
  });

  it("names a payload value that was changed, a caller and kind that were changed", () => {
    expect(check("docs", claimed, worked(pluggedIn, swap(/claimedname/g, "othername"))).why[0]).toMatch(/does not show the payload name claimedname/);
    expect(check("docs", claimed, worked(pluggedIn, swap("bob (signed in)", "carol (admin)"))).why.join("\n")).toMatch(/does not name the caller bob[\s\S]*does not say the caller is signed-in/);
  });

  it("holds a value from the world to the words of its reference, and never an id", () => {
    const why = check("docs", claimed, worked(pluggedIn, swap("gets back the world's handle", "gets back hdl_9f31ab42"))).why.join("\n");
    expect(why).toMatch(/does not name the answer it checks in the words world handle/);
    const payloadRef = Object.values(pluggedIn.model.journeys!).flatMap((j) => j.steps.flatMap((s) => Object.values(s.call?.payload ?? {}))).some((v) => typeof v === "object" && v !== null);
    expect(payloadRef, "the model has a payload value taken from the world").toBe(true);
  });

  it("reads a reference wherever it sits: nested in an answer, in a refusal's fields, in a payload; an id beside the words is still an id", () => {
    const stranger = "a stranger cannot edit a page";
    const strangerOp = Object.values(pluggedIn.model.journeys!).find((j) => j.name === stranger)!.steps.find((st) => st.title === "aaron's page is exactly as he left it")!.call!.operation;
    const swapOp = (op: string, from: string | RegExp, to: string) => (page: string, at: string) => (at === op ? page.replace(from, to) : page);
    expect(check("docs", stranger, worked(pluggedIn)), "the nested reference in words, and the literals beside it").toEqual({ ok: true, why: [] });
    expect(check("docs", stranger, worked(pluggedIn, swapOp(strangerOp, "the world's lastLink", "a link"))).why.join("\n")).toMatch(/does not name the answer it checks in the words world lastLink/);
    expect(check("docs", stranger, worked(pluggedIn, swapOp(strangerOp, "the world's lastLink", "the world's lastLink, lnk_9f31ab42"))).why.join("\n")).toMatch(/writes an id where the answer it checks is the journey's world lastLink/);
    expect(check("docs", claimed, worked(pluggedIn, swap("gets back the world's handle", "gets back the world's handle hdl_9f31ab42"))).why.join("\n")).toMatch(/writes an id where the answer it checks is the journey's world handle/);
    expect(check("docs", "add, order and remove a link", worked(pluggedIn, (page) => page.replace(" (removed)", ""))).why.join("\n")).toMatch(/does not show the refusal's fields removed/);
    const withRef = Object.values(pluggedIn.model.journeys!).flatMap((j) => j.steps.map((st) => ({ j, st }))).find(({ st }) => Object.values(st.call?.payload ?? {}).some((v) => typeof v === "object" && v !== null && "ref" in v))!;
    const field = Object.entries(withRef.st.call!.payload!).find(([, v]) => typeof v === "object" && v !== null && "ref" in v)!;
    const ref = (field[1] as { ref: ReadonlyArray<string> }).ref;
    const asId = worked(pluggedIn, swapOp(withRef.st.call!.operation, `${field[0]} ${words(ref)}`, `${field[0]} hdl_9f31ab42`));
    expect(check("docs", withRef.j.name, asId).why.join("\n"), "an id where the journey takes the value from the world").toMatch(new RegExp(`the payload ${field[0]} in the words ${ref.join(" ")}`));
  });

  it("holds the content of an answer, not its JSON: a dropped leaf fails, prose passes, a stray number is no answer", () => {
    const journey2 = "add, order and remove a link";
    const prose = worked(pluggedIn);
    expect(check("docs", journey2, prose), "the lists are shown by their values, in prose").toEqual({ ok: true, why: [] });
    expect(check("docs", journey2, worked(pluggedIn, (page) => page.replace("gets back Newsletter, Blog, Talks, GitHub", "gets back Newsletter, Blog, GitHub"))).why.join("\n")).toMatch(/does not show the answer it checks Talks/);
    // A bare 1 is an answer only where the answer is: not in the title, the caller, the payload or the key.
    expect(check("docs", "a stranger cannot edit a page", prose)).toEqual({ ok: true, why: [] });
    const stray = worked(pluggedIn, (page) => page.replace(/gets back 1(?!\d)/g, "gets back some count 10"));
    expect(check("docs", "a stranger cannot edit a page", stray).why.join("\n")).toMatch(/does not show the answer it checks 1/);
  });

  it("holds the role a caller holds, the request key a step gives, and a step that checks no answer shown as answered", () => {
    const acmeWorked = worked(acme);
    const role = "an invitation is used once";
    expect(check("docs", role, acmeWorked)).toEqual({ ok: true, why: [] });
    expect(check("docs", role, worked(acme, (page) => page.replace("owner, as organization.owner", "member, as organization.member"))).why.join("\n")).toMatch(/does not name the role organization.owner the caller holds/);
    expect(check("docs", claimed, worked(pluggedIn, swap(" and request key first-claim", ""))).why.join("\n")).toMatch(/does not show the request key first-claim/);
    expect(check("docs", claimed, worked(pluggedIn, swap("is answered", "gets back nothing special"))).why.join("\n")).toMatch(/does not say it is answered \(it checks no answer\)/);
  });

  it("looks only in the journey's own entry: the same words under another journey's title, or in the Refusals table, do not count", () => {
    const moved = worked(pluggedIn, (page, op) => (op === "handle.claim" ? page.replace(`### ${claimed}`, "### some other journey") : page));
    expect(check("docs", claimed, moved).why[0]).toBe(`generated/docs/handle/claim.md's Worked examples have no entry titled "${claimed}"`);
    const elsewhere = worked(pluggedIn, (page, op) => (op === "handle.claim" ? page.replace("a taken name is refused", "a name is refused") : page));
    const borrowed = editFile(elsewhere, "generated/docs/handle/claim.md", (t) => t.replace("## Worked examples", "## Refusals\n\n| HandleTaken | HN-001 | a taken name is refused |\n\n## Worked examples"));
    expect(check("docs", claimed, borrowed).why[0]).toMatch(/leaves out the step "a taken name is refused"/);
  });

  it("names a starting world that is missing, and a page with no Worked examples section", () => {
    expect(check("docs", claimed, worked(pluggedIn, swap("Starts from the world `claimed`.", "Starts from nowhere."))).why).toEqual([`generated/docs/handle/claim.md: the entry for "${claimed}" does not name its starting world claimed`]);
    expect(check("docs", claimed).why).toEqual([`generated/docs/handle/claim.md has no "Worked examples" section`, `generated/docs/handle/resolve.md has no "Worked examples" section`]);
  });
});
