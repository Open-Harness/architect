// ST1.26, check 4 of 5 (Goal 5, slice 2; K29 section 3.4): "a read loads again after a write on its thing". Written first by the checks author, against pieces
// the web projection (ST1.25) has not written yet; a builder never edits it.
//
// WHAT IS REQUIRED. `ProfileGet.Root` (generated/web/profile/get.react.tsx, a read: it loads when it appears) and `LinkAdd.Form` (generated/web/link/add.react.tsx,
// a move on the link thing) on one page, in headless Chromium, on a real world of Plugged In, signed in as the owner of the page being read:
//  - the read loads once when it appears, and its value is `profile.get`'s answer for the name: no links yet;
//  - a person fills the form's two fields and presses its button: link.add is written, and with no reload of the page (a marker the page set is still
//    there, the page navigated once) the read loads again after the write has finished, and its value now holds the new link: exactly what `profile.get`
//    answers to the SDK from Node for the same name (a recording of the world), not something the page worked out;
//  - exactly one more `/profile/get` reached the world, and after the `/link/add` that caused it; none before it finished;
//  - an agent through UI SDK's bridge adds a second link and the read shows both, in the order `profile.get` answers them;
//  - the bridge lists the read with an action to reload it (K29: `agent: { actions: ["reload"] }`), and its value is what the page printed.
// The read's own thing and the things its answer refers to are derived (`reloadsOn`), so the read reloads for `link` though the page never says so.
//
// WHAT IT READS: the bridge's snapshot value of the read (every key of it, against the SDK's answer), `/profile/get` and `/link/add` as they reached the
// world, in order, the page's marker and its navigation count, and `profile.get` from Node before and after.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { act, call, inputOf, labelOf, model, needPieces, openSite, snapshot, submitOf, until, type Entry, type Person, type Site } from "./web-support.ts";

const m = model();
const add = m.operations["link.add"]!;
const get = m.operations["profile.get"]!;
const missing = needPieces("profile.get", "link.add");

let site: Site;
let aaron: Person;

beforeAll(async () => {
  expect(missing, missing).toBeUndefined();
  expect(Object.keys(add.payload).sort(), "link.add's payload in the model").toEqual(["title", "url"]);
  expect(Object.keys(get.payload), "profile.get's payload in the model").toEqual(["handle"]);
  site = await openSite("profile");
  aaron = await site.person("aaron");
  const claimed = await call(site, aaron, "handle.claim", { name: "readpage" });
  expect(claimed.ok, JSON.stringify(claimed)).toBe(true);
}, 300_000);
afterAll(async () => { await site?.close(); }, 120_000);

const paths = (from = 0) => site.loop.proxy.seen.slice(from).map((s) => s.path).filter((p) => p === "/profile/get" || p === "/link/add");
/** The read in the bridge's snapshot: the entry that can be reloaded. */
const readOf = (entries: ReadonlyArray<Entry>) => entries.filter((e) => e.actions?.includes("reload"));
const shown = async (page: Awaited<ReturnType<Site["open"]>>) => readOf(await snapshot(page))[0]?.value;
const answerOf = async () => {
  const a = await call<{ handle: string; links: ReadonlyArray<unknown> }>(site, undefined, "profile.get", { handle: "readpage" });
  expect(a.ok, JSON.stringify(a)).toBe(true);
  return a.ok ? a.answer : undefined;
};
const notReloaded = (page: Awaited<ReturnType<Site["open"]>>) => page.evaluate(() => ({ marker: (window as any).__sentinel, navigations: performance.getEntriesByType("navigation").length }));

describe("07 a read loads again after a write on its thing", () => {
  it("the read loads when it appears and shows profile.get's answer", async () => {
    const before = await answerOf();
    expect(before!.links, "the page starts with no links").toEqual([]);
    const from = site.loop.proxy.seen.length;
    const page = await site.open(aaron, { name: "readpage" });
    const entries = await snapshot(page);
    expect(readOf(entries).length, `one read in the snapshot: ${JSON.stringify(entries.map((e) => [e.label, e.component, e.actions]))}`).toBe(1);
    expect(await until("the read's value", () => shown(page), (v) => v !== undefined && v !== null)).toEqual(before);
    expect(paths(from), "one load").toEqual(["/profile/get"]);
    await page.close();
  });

  it("a person's link.add makes the read load again, with no reload of the page, and it shows what profile.get answers", async () => {
    const page = await site.open(aaron, { name: "readpage" });
    await until("the first load", () => shown(page), (v) => v !== undefined && v !== null);
    const from = site.loop.proxy.seen.length;
    await page.getByRole("textbox", { name: labelOf("title"), exact: true }).pressSequentially("My first link");
    await page.getByRole("textbox", { name: labelOf("url"), exact: true }).pressSequentially("https://aaron.example.com/first");
    await page.getByRole("button").click();
    const after = await until("the read shows the new link", async () => (await shown(page)) as { links?: ReadonlyArray<unknown> } | undefined, (v) => (v?.links?.length ?? 0) === 1);
    const seen = paths(from);
    const recorded = await answerOf();
    expect(recorded!.links.length, "the world holds the link").toBe(1);
    expect(after, "the read shows exactly what the world answers").toEqual(recorded);
    expect(JSON.stringify(recorded!.links), "the world holds the title and address as typed").toContain("My first link");
    expect(JSON.stringify(recorded!.links)).toContain("https://aaron.example.com/first");
    expect(seen, "the write, then exactly one more load").toEqual(["/link/add", "/profile/get"]);
    expect(await notReloaded(page), "the page was not reloaded").toEqual({ marker: "this page was not reloaded", navigations: 1 });
    expect(page.problems).toEqual([]);
    await page.close();
  });

  it("an agent's link.add makes the read show both links, in the order profile.get answers them", async () => {
    const page = await site.open(aaron, { name: "readpage" });
    const first = await until("the first load", () => shown(page), (v) => v !== undefined && v !== null);
    expect((first as { links: ReadonlyArray<unknown> }).links.length, "the first link is already there").toBe(1);
    const entries = await snapshot(page);
    const title = inputOf(entries, labelOf("title"));
    const url = inputOf(entries, labelOf("url"));
    const verb = submitOf(entries);
    expect([title.length, url.length, verb.length], "the agent finds the form's two inputs and its verb").toEqual([1, 1, 1]);
    const from = site.loop.proxy.seen.length;
    const result = await act(page, [{ ref: title[0]!.ref, action: "setValue", args: ["Second"] }, { ref: url[0]!.ref, action: "setValue", args: ["https://aaron.example.com/second"] }, { ref: verb[0]!.ref, action: "submit" }]);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const after = await until("the read shows two links", async () => (await shown(page)) as { links?: ReadonlyArray<unknown> } | undefined, (v) => (v?.links?.length ?? 0) === 2);
    const seen = paths(from);
    const recorded = await answerOf();
    expect(recorded!.links.length).toBe(2);
    expect(after).toEqual(recorded);
    expect(JSON.stringify(recorded!.links), "the world holds the second link as typed").toContain("https://aaron.example.com/second");
    expect(JSON.stringify(recorded!.links)).toContain("Second");
    expect(seen, "the write, then exactly one more load").toEqual(["/link/add", "/profile/get"]);
    expect(await notReloaded(page)).toEqual({ marker: "this page was not reloaded", navigations: 1 });
    await page.close();
  });

  it("a refused write changes nothing the read shows (the control: a write that did not happen does not move the read)", async () => {
    const stranger = await site.person("stranger");
    const page = await site.open(stranger, { name: "readpage" });
    const before = await until("the first load", () => shown(page), (v) => v !== undefined && v !== null);
    const from = site.loop.proxy.seen.length;
    await page.getByRole("textbox", { name: labelOf("title"), exact: true }).pressSequentially("Not mine");
    await page.getByRole("textbox", { name: labelOf("url"), exact: true }).pressSequentially("https://stranger.example.com/");
    await page.getByRole("button").click();
    await until("the write was answered", async () => paths(from).includes("/link/add"), Boolean);
    // What the world refuses a person with no name of their own, recorded through the SDK; the page must show that refusal.
    const refused = await call(site, stranger, "link.add", { title: "Not mine", url: "https://stranger.example.com/" });
    expect(refused.ok, "the world refuses the stranger's link").toBe(false);
    const world = refused.ok ? { error: "", code: "" } : { error: refused.error, code: refused.code ?? "" };
    expect(Object.keys(m.refusals).includes(world.error) && add.refusals.includes(world.error), "a refusal link.add declares").toBe(true);
    await until("the page shows the refusal", () => page.locator("body").innerText(), (t) => t.includes(world.code));
    expect(await page.locator("body").innerText(), "the refusal is named").toContain(world.error);
    expect(await shown(page), "the read shows what profile.get answers").toEqual(await answerOf());
    expect(await shown(page)).toEqual(before);
    await page.close();
  });
});
