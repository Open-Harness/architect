// ST1.26, check 2 of 5 (Goal 5, slice 2; K29 sections 3.2 and 1): "a taken name shows `HandleTaken` with `HN-001` under the field and fails an
// agent's step with it". Written first by the checks author, against pieces the web projection (ST1.25) has not written yet; a builder never edits it.
//
// WHAT IS REQUIRED. `HandleClaim.Form` (generated/web/handle/claim.react.tsx) mounted in headless Chromium, on a real world of Plugged In
// (workerd, D1; no jsdom, no fake server):
//  - a person types a name another person holds and presses the form's one button: the page shows the refusal's name `HandleTaken` and its
//    code `HN-001` in one element placed under the Name field (below the input, over its width), and no other refusal's code anywhere;
//  - the same for each other refusal the operation declares and a page can reach, each with its own name and code: `HandleAlreadyOwned` (a person
//    who already holds a name) and `NotAllowed` (a visitor with no session). A form that always shows HN-001 is refused;
//  - an agent through UI SDK's bridge (`createAgent`, `snapshot`, `act`) fills the Name input and sends the verb: the step fails (`ok: false`)
//    and the failure names the refusal and its code, and the page shows what a person is shown;
//  - nothing is written by any of them: the journal of the refused request is empty and the name still resolves to its first holder's handle.
// Every name and code is read from the model (`generated/model/model.json`): the refusals table and the operation's `refusals`. The held name's handle
// comes from the world itself, through the generated SDK.
//
// WHAT IT READS: the Name input, the form's button, the refusal element (its text, its box), the page's whole text (for other codes), the bridge's
// snapshot (the Name input and the verb's `submit`), `act`'s result and its message, the journal and `handle.resolve` before and after.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { act, call, declaredError, inputOf, labelOf, model, needPieces, openSite, snapshot, submitOf, written, type Person, type Site } from "./web-support.ts";

const m = model();
const claim = m.operations["handle.claim"]!;
const nameKey = Object.keys(claim.payload);
const REFUSALS = ["HandleTaken", "HandleAlreadyOwned", "NotAllowed"].map((name) => declaredError(m, "handle.claim", name));
const missing = needPieces("handle.claim");

let site: Site;
let aaron: Person;
let bob: Person;
let carol: Person;
let held: { readonly name: string; readonly handle: string };

beforeAll(async () => {
  expect(missing, missing).toBeUndefined();
  expect(nameKey, "handle.claim's payload in the model").toEqual(["name"]);
  site = await openSite("claim");
  [aaron, bob, carol] = await Promise.all([site.person("aaron"), site.person("bob"), site.person("carol")]) as [Person, Person, Person];
  const claimed = await call<{ handle: string }>(site, aaron, "handle.claim", { name: "heldname" });
  expect(claimed.ok, JSON.stringify(claimed)).toBe(true);
  held = { name: "heldname", handle: claimed.ok ? claimed.answer.handle : "" };
}, 300_000);
afterAll(async () => { await site?.close(); }, 120_000);

const field = (page: Awaited<ReturnType<Site["open"]>>) => page.getByRole("textbox", { name: labelOf("name"), exact: true });

/** What a person sees after typing `name` and pressing the form's button: the one element that shows the code, and where it is. */
const press = async (page: Awaited<ReturnType<Site["open"]>>, name: string, code: string) => {
  await field(page).pressSequentially(name);
  await page.getByRole("button").click();
  const shown = page.getByText(code);
  await shown.first().waitFor({ timeout: 15_000 });
  const input = (await field(page).boundingBox())!;
  const box = (await shown.first().boundingBox())!;
  return { count: await shown.count(), text: (await shown.first().textContent()) ?? "", input, box, body: (await page.locator("body").innerText()) };
};

describe("05 a person's press on a refused claim", () => {
  it("a name another person holds shows `HandleTaken` with `HN-001` under the field, and writes nothing", async () => {
    const taken = REFUSALS[0]!;
    const page = await site.open(bob);
    const from = site.loop.proxy.seen.length;
    const shown = await press(page, held.name, taken.code);
    expect(shown.count, `the code ${taken.code} should be shown once`).toBe(1);
    expect(shown.text, "the refusal names the declared error").toContain(taken.name);
    expect(shown.box.y, "under the field: the refusal starts below the input").toBeGreaterThanOrEqual(shown.input.y + shown.input.height - 1);
    expect(shown.box.x < shown.input.x + shown.input.width && shown.box.x + shown.box.width > shown.input.x, "under the field: over the input's width").toBe(true);
    for (const other of REFUSALS.filter((r) => r.name !== taken.name)) expect(shown.body, `${other.name}'s code is not shown for ${taken.name}`).not.toContain(other.code);
    expect(await written(site, "/handle/claim", from), "nothing was written").toEqual([]);
    expect(await call(site, undefined, "handle.resolve", { name: held.name }), "the name still resolves to its first holder's handle").toEqual({ ok: true, answer: { handle: held.handle } });
    expect(page.problems).toEqual([]);
    await page.close();
  });

  it("a person who already holds a name shows `HandleAlreadyOwned` with its own code, not HN-001", async () => {
    const owned = REFUSALS[1]!;
    const page = await site.open(aaron);
    const from = site.loop.proxy.seen.length;
    const shown = await press(page, "anothername", owned.code);
    expect(shown.text).toContain(owned.name);
    expect(shown.box.y).toBeGreaterThanOrEqual(shown.input.y + shown.input.height - 1);
    for (const other of REFUSALS.filter((r) => r.name !== owned.name)) expect(shown.body, `${other.name}'s code is not shown`).not.toContain(other.code);
    expect(await written(site, "/handle/claim", from)).toEqual([]);
    expect(await call(site, undefined, "handle.resolve", { name: "anothername" }), "the second name was not claimed").toMatchObject({ ok: false });
    await page.close();
  });

  it("a visitor with no session shows `NotAllowed` with its own code", async () => {
    const denied = REFUSALS[2]!;
    const page = await site.open(undefined);
    const from = site.loop.proxy.seen.length;
    const shown = await press(page, "visitorname", denied.code);
    expect(shown.text).toContain(denied.name);
    expect(shown.box.y).toBeGreaterThanOrEqual(shown.input.y + shown.input.height - 1);
    for (const other of REFUSALS.filter((r) => r.name !== denied.name)) expect(shown.body, `${other.name}'s code is not shown`).not.toContain(other.code);
    expect(await written(site, "/handle/claim", from)).toEqual([]);
    await page.close();
  });
});

describe("05 an agent's step on a refused claim", () => {
  const agentClaims = async (who: Person, name: string) => {
    const page = await site.open(who);
    const entries = await snapshot(page);
    const input = inputOf(entries, labelOf("name"));
    const verb = submitOf(entries);
    expect(input.length, `one input labelled ${labelOf("name")} in the snapshot of ${JSON.stringify(entries.map((e) => [e.label, e.component, e.actions]))}`).toBe(1);
    expect(verb.length, "one component the agent can submit").toBe(1);
    const from = site.loop.proxy.seen.length;
    const result = await act(page, [{ ref: input[0]!.ref, action: "setValue", args: [name] }, { ref: verb[0]!.ref, action: "submit" }]);
    return { page, result, from };
  };

  it("a taken name fails the step with `HandleTaken` and `HN-001`, shows what a person is shown, and writes nothing", async () => {
    const taken = REFUSALS[0]!;
    const { page, result, from } = await agentClaims(carol, held.name);
    expect(result.ok, "the step fails").toBe(false);
    expect(result.error?.message, "the failure names the refusal and its code").toContain(taken.name);
    expect(result.error?.message).toContain(taken.code);
    expect(await page.getByText(taken.code).count(), "the page shows the same refusal").toBeGreaterThan(0);
    expect(await written(site, "/handle/claim", from)).toEqual([]);
    expect(await call(site, undefined, "handle.resolve", { name: held.name })).toEqual({ ok: true, answer: { handle: held.handle } });
    await page.close();
  });

  it("a person who already holds a name fails the step with `HandleAlreadyOwned` and its own code", async () => {
    const owned = REFUSALS[1]!;
    const { page, result, from } = await agentClaims(aaron, "agentsname");
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain(owned.name);
    expect(result.error?.message).toContain(owned.code);
    expect(result.error?.message, "not another refusal's code").not.toContain(REFUSALS[0]!.code);
    expect(await written(site, "/handle/claim", from)).toEqual([]);
    await page.close();
  });

  it("a free name succeeds for the agent, and is written once (the control: the same steps can pass)", async () => {
    const { page, result, from } = await agentClaims(carol, "carolspage");
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(await written(site, "/handle/claim", from)).toEqual([claim.move!.emits]);
    expect(await call(site, undefined, "handle.resolve", { name: "carolspage" })).toMatchObject({ ok: true });
    await page.close();
  });
});
