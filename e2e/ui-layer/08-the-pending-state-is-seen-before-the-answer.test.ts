// ST1.26, check 5 of 5 (Goal 5, slice 2; K29 sections 2 and 3.4): "the pending state is observed before the answer". Written first by the checks author,
// against pieces the web projection (ST1.25) has not written yet; a builder never edits it.
//
// THE ANSWER IS HELD BACK, NOT RACED. Playwright's `page.route` stops the request on its way to the world and answers only when the test says. While it is held
// the test looks at the page: the piece must say it is pending, show no answer and no refusal, and send nothing twice. Only then is the request let through,
// and the answer (or the refusal) must replace the pending state. There is no sleep and no timing: what is seen is seen while the request cannot have been answered.
//
// WHAT IS REQUIRED, in headless Chromium on a real world of Plugged In:
//  - a move (`HandleClaim.Form`): after a person presses the button, while the request is held, the piece's root says it is pending (`aria-busy="true"` or a
//    `data-pending` attribute: K29's `pending` state), no answer and no refusal is shown, and pressing again (Enter in the input, the button) sends no second request;
//    after the request is let through the pending state is gone and the answer shows the handle the world wrote (read from the journal, not from the page);
//  - the same for a refusal: held, pending, then `HandleTaken` and `HN-001` and no pending state;
//  - an agent's step (`act` through UI SDK's bridge) on the same piece does not finish while the request is held, and finishes when it is let through, ok;
//  - a read (`ProfileGet.Root`): while its request is held it is pending and has no value; afterwards it has profile.get's answer and is no longer pending.
//
// WHAT IT READS: the piece's root (its pending marker), the answer element (its text against the journal's handle), the refusal's text (against the model's name and
// code), the held request's count at the world's door, `act`'s promise (finished or not), the bridge's value of the read against `profile.get` from Node.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Page, Route } from "playwright";
import { call, declaredError, inputOf, labelOf, model, needPieces, openSite, snapshot, submitOf, until, written, type Entry, type Person, type Site } from "./web-support.ts";

const m = model();
const taken = declaredError(m, "handle.claim", "HandleTaken");
const missing = needPieces("handle.claim", "profile.get");

let site: Site;
let aaron: Person;
let bob: Person;

beforeAll(async () => {
  expect(missing, missing).toBeUndefined();
  site = await openSite("claim");
  [aaron, bob] = await Promise.all([site.person("aaron"), site.person("bob")]) as [Person, Person];
  const claimed = await call(site, aaron, "handle.claim", { name: "heldname" });
  expect(claimed.ok, JSON.stringify(claimed)).toBe(true);
}, 300_000);
afterAll(async () => { await site?.close(); }, 120_000);

/** Holds every request to `path` until `let()`; says how many are held right now. */
const hold = async (page: Page, path: string) => {
  const held: Array<Route> = [];
  let open = false;
  await page.route((url) => url.pathname === path, (route) => { if (open) void route.continue(); else held.push(route); });
  return {
    count: () => held.length,
    arrived: (n: number) => until(`${n} request(s) held`, async () => held.length, (c) => c >= n),
    let: async () => { open = true; for (const route of held.splice(0)) await route.continue(); },
  };
};

/** The piece's root says it is busy: K29's `pending`, as `aria-busy` or `data-pending`. */
const pending = (page: Page) => page.evaluate(() => document.querySelectorAll('[aria-busy="true"], [data-pending]').length > 0);
const text = (page: Page) => page.locator("body").innerText();

describe("08 the pending state is seen before the answer", () => {
  it("a move: pending while the request is held, then the answer the world wrote", async () => {
    const page = await site.open(bob);
    const gate = await hold(page, "/handle/claim");
    const from = site.loop.proxy.seen.length;
    await page.getByRole("textbox", { name: labelOf("name"), exact: true }).pressSequentially("pendingname");
    expect(await pending(page), "idle before the press").toBe(false);
    await page.getByRole("button").click();
    await gate.arrived(1);
    expect(await pending(page), "pending while the answer is held").toBe(true);
    const during = await text(page);
    expect(during, "no refusal while pending").not.toContain(taken.code);
    expect(during, "no answer while pending").not.toMatch(/hdl_[0-9a-z]+/);
    expect(await written(site, "/handle/claim", from), "the world has written nothing yet").toEqual([]);
    await page.getByRole("textbox", { name: labelOf("name"), exact: true }).press("Enter");
    await page.getByRole("button").click({ force: true, timeout: 2000 }).catch(() => undefined);
    expect(gate.count(), "pressing again while pending sends nothing more").toBe(1);
    await gate.let();
    await until("the pending state ends", () => pending(page), (p) => !p);
    const events = await until("the world wrote the claim", () => site.loop.proxy.seen.slice(from).filter((s) => s.path === "/handle/claim").length > 0 ? site.loop.journal(site.loop.proxy.seen.slice(from).filter((s) => s.path === "/handle/claim")[0]!.trace) : Promise.resolve([]), (j) => j.length > 0);
    const handle = String((events[0] as { fields: { handle: string } }).fields.handle);
    expect(events.map((e) => e.event), "claimed once").toEqual([m.operations["handle.claim"]!.move!.emits]);
    expect(await text(page), "the answer is the handle the world wrote").toContain(handle);
    expect(site.loop.proxy.seen.slice(from).filter((s) => s.path === "/handle/claim").length, "one request in all").toBe(1);
    await page.close();
  });

  it("a refusal: pending while held, then HandleTaken and HN-001, and no pending state", async () => {
    const page = await site.open(bob);
    const gate = await hold(page, "/handle/claim");
    await page.getByRole("textbox", { name: labelOf("name"), exact: true }).pressSequentially("heldname");
    await page.getByRole("button").click();
    await gate.arrived(1);
    expect(await pending(page)).toBe(true);
    expect(await text(page)).not.toContain(taken.code);
    await gate.let();
    await until("the refusal shows", () => text(page), (t) => t.includes(taken.code));
    expect(await text(page)).toContain(taken.name);
    expect(await pending(page), "not pending once refused").toBe(false);
    await page.close();
  });

  it("an agent's step does not finish while the request is held, and finishes ok when it is let through", async () => {
    const carol = await site.person("carol");
    const page = await site.open(carol);
    const entries = await snapshot(page);
    const input = inputOf(entries, labelOf("name"));
    const verb = submitOf(entries);
    expect([input.length, verb.length]).toEqual([1, 1]);
    const gate = await hold(page, "/handle/claim");
    await page.evaluate((steps) => { const w = (window as any).__ortho; w.result = undefined; w.agent.act({ steps }).then((r: unknown) => { w.result = r; }); }, [{ ref: input[0]!.ref, action: "setValue", args: ["agentpending"] }, { ref: verb[0]!.ref, action: "submit" }] as never);
    await gate.arrived(1);
    expect(await pending(page), "pending while the agent's request is held").toBe(true);
    expect(await page.evaluate(() => (window as any).__ortho.result), "the agent's step has not finished").toBeUndefined();
    await gate.let();
    const result = await until("the step finishes", () => page.evaluate(() => (window as any).__ortho.result as { ok: boolean } | undefined), (r) => r !== undefined);
    expect(result!.ok, JSON.stringify(result)).toBe(true);
    expect(await pending(page)).toBe(false);
    await page.close();
  });
});

describe("08 a read is pending too", () => {
  let reads: Site;
  beforeAll(async () => {
    reads = await openSite("profile");
    const who = await reads.person("aaron");
    const claimed = await call(reads, who, "handle.claim", { name: "pendingread" });
    expect(claimed.ok, JSON.stringify(claimed)).toBe(true);
  }, 300_000);
  afterAll(async () => { await reads?.close(); }, 120_000);

  it("while its request is held it is pending and has no value; afterwards it has profile.get's answer", async () => {
    let gate!: Awaited<ReturnType<typeof hold>>;
    const fresh = await reads.open(undefined, { name: "pendingread" }, async (p) => { gate = await hold(p, "/profile/get"); });
    await gate.arrived(1);
    expect(await pending(fresh), "the read is pending while its request is held").toBe(true);
    const during = (await snapshot(fresh)).filter((e: Entry) => e.actions?.includes("reload"))[0];
    expect(during?.value ?? null, "no value yet").toBeNull();
    await gate.let();
    const recorded = await call<{ links: ReadonlyArray<unknown> }>(reads, undefined, "profile.get", { handle: "pendingread" });
    expect(recorded.ok).toBe(true);
    const value = await until("the read has its value", async () => (await snapshot(fresh)).filter((e) => e.actions?.includes("reload"))[0]?.value, (v) => v !== undefined && v !== null);
    expect(value).toEqual(recorded.ok ? recorded.answer : undefined);
    expect(await pending(fresh), "not pending once answered").toBe(false);
    await fresh.close();
  });
});
