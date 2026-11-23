// ST1.26, check 3 of 5 (Goal 5, slice 2; K29 section 3.3): "a release waits for a person's yes". Written first by the checks author, against pieces the web
// projection (ST1.25) has not written yet; a builder never edits it.
//
// NEEDS `needsApproval`: Goal 3 landed it (PR #555, design/decisions/ST1-needs-approval-declaration.md): `handle.release` declares `needsApproval: true` and the model
// carries it, which the first test reads, so this check is judged against the real model.
//
// WHAT IS REQUIRED, the model saying `handle.release` needs approval: `HandleRelease.Confirm` (generated/web/handle/release.react.tsx) mounted in
// headless Chromium on a real world of Plugged In, signed in as the name's owner, driven through UI SDK's own bridge:
//  - an agent's press on the confirming control (the button marked `data-agent-confirm` in the piece's dialog, never the trigger) does not send until a person
//    says yes: while the bridge's question is unanswered the step has not finished, nothing has reached the world and the name still resolves. The question
//    is the operation's own description from the model, asked once, by the bridge, and never again by the host;
//  - a yes sends the release once: HandleReleased, and the name no longer resolves;
//  - a no writes nothing: the step fails, no request reaches the world, the journal is empty and the name still resolves;
//  - with nobody to ask (a bridge made with no `allow`) the step is refused by the bridge ("Needs a person") and nothing is sent: the mark is on the control;
//  - a person's own press on the same control (trigger, then confirm) is the yes: one request, HandleReleased, nobody asked.
// An operation with no `needsApproval` (handle.claim) is never asked about, which check 05 reads.
//
// WHAT IT READS: the model's `handle.release` (its `needsApproval`, its description, the event it emits, its `handle.resolve` refusal), the dialog's confirming
// button (its `data-agent-confirm`), the bridge's snapshot and `act`, what the bridge asked (`window.__ortho.asked`) and what the host asked, the requests
// that reached the world's door, the journal and `handle.resolve`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { act, call, declaredError, model, needPieces, openSite, reached, snapshot, until, written, type Entry, type Site } from "./web-support.ts";

const m = model();
const release = m.operations["handle.release"]!;
const gone = declaredError(m, "handle.resolve", "HandleNotFound");
const missing = needPieces("handle.release");

let site: Site;
let n = 0;
/** A person who owns a fresh name: their handle's id comes from the world. */
const owner = async () => {
  const who = await site.person(`owner${++n}`);
  const name = `releaseme${n}`;
  const claimed = await call<{ handle: string }>(site, who, "handle.claim", { name });
  expect(claimed.ok, JSON.stringify(claimed)).toBe(true);
  return { who, name, handle: claimed.ok ? claimed.answer.handle : "" };
};
const resolves = (name: string) => call(site, undefined, "handle.resolve", { name });
const asked = (page: Awaited<ReturnType<Site["open"]>>) => page.evaluate(() => (window as any).__ortho.asked as Array<string>);
const hostAsked = (page: Awaited<ReturnType<Site["open"]>>) => page.evaluate(() => (window as any).__ortho.hostAsked as number);
const asking = (page: Awaited<ReturnType<Site["open"]>>) => page.evaluate(() => ((window as any).__ortho.asking?.sentence ?? null) as string | null);

/** The component an agent presses a dialog's buttons through: the alert dialog the piece wraps its confirmation in. */
const dialogOf = (entries: ReadonlyArray<Entry>) => entries.filter((e) => /dialog/i.test(e.component))[0] ?? entries.filter((e) => /release/i.test(e.label ?? ""))[0];

beforeAll(async () => {
  expect(missing, missing).toBeUndefined();
  site = await openSite("release");
}, 300_000);
afterAll(async () => { await site?.close(); }, 120_000);

describe("06 a release waits for a person's yes", () => {
  it("the model says handle.release needs a person's yes, and no other operation does ", () => {
    expect(release.needsApproval, "`needsApproval: true` on handle.release: the language cannot say it yet (ST1-needs-approval-declaration)").toBe(true);
    expect(Object.values(m.operations).filter((o) => o.needsApproval === true).map((o) => o.name)).toEqual(["handle.release"]);
  });

  /** The words the confirming button carries, read once from a person's side: the button is the one in the opened dialog that carries `data-agent-confirm`. */
  let confirm: { readonly text: string; readonly sentence: string };
  it("the piece's confirming control carries the operation's own description as `data-agent-confirm`", async () => {
    const o = await owner();
    const page = await site.open(o.who, { handle: o.handle });
    expect(await page.locator("[data-agent-confirm]").count(), "nothing on the page is marked for a person's yes before the dialog opens").toBe(0);
    await page.getByRole("button").first().click();
    await page.getByRole("alertdialog").waitFor({ timeout: 15_000 });
    expect(await page.locator("[data-agent-confirm]").count(), "one control on the whole page is marked").toBe(1);
    const marked = page.getByRole("alertdialog").locator("[data-agent-confirm]");
    expect(await marked.count(), "exactly one control in the dialog is marked for a person's yes").toBe(1);
    confirm = { text: ((await marked.textContent()) ?? "").trim(), sentence: (await marked.getAttribute("data-agent-confirm")) ?? "" };
    expect(confirm.sentence, "what the person is asked is the operation's description in the model").toBe(release.description);
    expect(confirm.text, "the confirming control's text").not.toBe("");
    expect(await resolves(o.name), "opening the dialog released nothing").toMatchObject({ ok: true });
    await page.close();
  });

  it("the dialog's other buttons release nothing: pressing each of them sends no request and asks nobody", async () => {
    const o = await owner();
    const page = await site.open(o.who, { handle: o.handle });
    const from = site.loop.proxy.seen.length;
    await page.getByRole("button").first().click();
    const dialog = page.getByRole("alertdialog");
    await dialog.waitFor({ timeout: 15_000 });
    const others = await dialog.locator("button:not([data-agent-confirm])").count();
    expect(others, "the dialog has a way to keep the name").toBeGreaterThanOrEqual(1);
    await dialog.locator("button:not([data-agent-confirm])").first().click();
    await dialog.waitFor({ state: "detached", timeout: 15_000 });
    expect(site.loop.proxy.seen.slice(from).filter((s) => s.path === "/handle/release"), "no request").toEqual([]);
    expect(await resolves(o.name), "the name still resolves").toMatchObject({ ok: true, answer: { handle: o.handle } });
    expect(await asked(page)).toEqual([]);
    await page.close();
  });

  it("an agent's press waits for a person: nothing is sent while the question is open, and a yes releases once", async () => {
    const o = await owner();
    const page = await site.open(o.who, { handle: o.handle });
    const dialog = dialogOf(await snapshot(page));
    expect(dialog, "the snapshot lists the dialog the agent presses through").toBeDefined();
    const from = site.loop.proxy.seen.length;
    await page.evaluate((steps) => { const w = (window as any).__ortho; w.result = undefined; w.agent.act({ steps }).then((r: unknown) => { w.result = r; }); }, [{ ref: dialog!.ref, action: "press", args: [confirm.text] }] as never);
    expect(await until("the bridge asks a person", () => asking(page), (s) => s !== null), "the question is the operation's description").toBe(release.description);
    expect(reached(site, "/handle/release"), "nothing has reached the world while the question is open").toBe(0);
    expect(await page.evaluate(() => (window as any).__ortho.result), "the agent's step has not finished").toBeUndefined();
    expect(await resolves(o.name), "the name still resolves").toMatchObject({ ok: true, answer: { handle: o.handle } });
    await page.evaluate(() => (window as any).__ortho.asking.answer(true));
    const result = await until("the step finishes", () => page.evaluate(() => (window as any).__ortho.result as { ok: boolean } | undefined), (r) => r !== undefined);
    expect(result!.ok, JSON.stringify(result)).toBe(true);
    expect(await until("the release is written", () => written(site, "/handle/release", from), (w) => w.length > 0), "released once").toEqual([release.move!.emits]);
    expect(await resolves(o.name), "the name no longer resolves").toMatchObject({ ok: false, error: gone.name, code: gone.code });
    expect(await asked(page), "asked once, by the bridge").toEqual([release.description]);
    expect(await hostAsked(page), "the host never asks a press the bridge already asked about").toBe(0);
    await page.close();
  });

  it("a no writes nothing: the step fails, no request is sent, and the name still resolves", async () => {
    const o = await owner();
    const page = await site.open(o.who, { handle: o.handle });
    const dialog = dialogOf(await snapshot(page));
    const from = site.loop.proxy.seen.length;
    await page.evaluate((steps) => { const w = (window as any).__ortho; w.result = undefined; w.agent.act({ steps }).then((r: unknown) => { w.result = r; }); }, [{ ref: dialog!.ref, action: "press", args: [confirm.text] }] as never);
    await until("the bridge asks a person", () => asking(page), (s) => s !== null);
    await page.evaluate(() => (window as any).__ortho.asking.answer(false));
    const result = await until("the step finishes", () => page.evaluate(() => (window as any).__ortho.result as { ok: boolean } | undefined), (r) => r !== undefined);
    expect(result!.ok, "a no fails the step").toBe(false);
    expect(site.loop.proxy.seen.slice(from).filter((s) => s.path === "/handle/release"), "no request").toEqual([]);
    expect(await written(site, "/handle/release", from)).toEqual([]);
    expect(await resolves(o.name), "the name still resolves").toMatchObject({ ok: true, answer: { handle: o.handle } });
    expect(await asked(page)).toEqual([release.description]);
    await page.close();
  });

  it("with nobody to ask, the bridge refuses the step and nothing is sent: the mark is on the control", async () => {
    const o = await owner();
    const page = await site.open(o.who, { handle: o.handle, allow: "none" });
    const dialog = dialogOf(await snapshot(page));
    const from = site.loop.proxy.seen.length;
    const result = await act(page, [{ ref: dialog!.ref, action: "press", args: [confirm.text] }]);
    expect(result.ok).toBe(false);
    expect(result.error?.message ?? "", "the bridge's own refusal").toMatch(/needs a person/i);
    expect(site.loop.proxy.seen.slice(from).filter((s) => s.path === "/handle/release")).toEqual([]);
    expect(await resolves(o.name)).toMatchObject({ ok: true, answer: { handle: o.handle } });
    await page.close();
  });

  it("a person's own press on the trigger and then the confirming control is the yes: one release, nobody asked", async () => {
    const o = await owner();
    const page = await site.open(o.who, { handle: o.handle });
    const from = site.loop.proxy.seen.length;
    await page.getByRole("button").first().click();
    const marked = page.getByRole("alertdialog").locator("[data-agent-confirm]");
    await marked.waitFor({ timeout: 15_000 });
    expect(await resolves(o.name), "opening the dialog released nothing").toMatchObject({ ok: true });
    await marked.click();
    await until("the world heard the release", async () => reached(site, "/handle/release"), (c) => c >= 1);
    expect(await until("the release is written", () => written(site, "/handle/release", from), (w) => w.length > 0)).toEqual([release.move!.emits]);
    expect(await resolves(o.name)).toMatchObject({ ok: false, error: gone.name });
    expect(await asked(page), "a person's own press asks nobody").toEqual([]);
    expect(await hostAsked(page)).toBe(0);
    await page.close();
  });

  it("a stranger's yes is not the guard: the world refuses the release with NotAllowed, the page shows it, and nothing is written", async () => {
    const o = await owner();
    const stranger = await site.person("stranger");
    const refused = declaredError(m, "handle.release", "NotAllowed");
    const page = await site.open(stranger, { handle: o.handle });
    const dialog = dialogOf(await snapshot(page));
    const from = site.loop.proxy.seen.length;
    await page.evaluate((steps) => { const w = (window as any).__ortho; w.result = undefined; w.agent.act({ steps }).then((r: unknown) => { w.result = r; }); }, [{ ref: dialog!.ref, action: "press", args: [confirm.text] }] as never);
    await until("the bridge asks", () => asking(page), (s) => s !== null);
    await page.evaluate(() => (window as any).__ortho.asking.answer(true));
    const result = await until("the step finishes", () => page.evaluate(() => (window as any).__ortho.result as { ok: boolean; error?: { message?: string } } | undefined), (r) => r !== undefined);
    void result;
    expect(await until("the page shows the refusal", () => page.locator("body").innerText(), (t) => t.includes(refused.code)), "the world's refusal is what the page shows").toContain(refused.name);
    expect(await written(site, "/handle/release", from)).toEqual([]);
    expect(await resolves(o.name)).toMatchObject({ ok: true, answer: { handle: o.handle } });
    await page.close();
  });
});
