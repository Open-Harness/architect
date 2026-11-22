// Check 03 (M5.03): the door, hit directly at /_in/bank. What a journey cannot reach, because a journey's sender signs
// truly: every way to a bad signature, a body altered after signing, a type nobody knows, an included event that does
// not decode, the journal row the inbox writes (its id, operation and subject), a repeat across a kill and a restart,
// five identical requests at once, and a method or a mount the door does not answer.
//
// The club is check 01's (`e2e/fixtures/events/in` and the fixture bank), as a launched world (world.ts) so a test can
// kill it. The check signs by hand (door.ts) with the secret the bank's `blueprint/secrets.ts` declares for worlds. It
// continues its own trace (`traceparent`), so `/_world/facts/journal?trace=` shows exactly what one request wrote.
// Every expected value is a literal here.
//
// What is pinned (M5-reach-out Q2, M5-checks calls 3 and 4): a bad or stale signature answers 401 `{ _tag: "BadSignature" }`
// and writes nothing; a type the mount does not include, an unknown type, and an included event that does not decode
// answer 200 `{ ignored: true }` and write nothing; an accepted event answers 200 `{ accepted: true }` and writes one
// `_journal` row `id = "bank:<sender's id>"`, `operation = "in:bank"`, `subject` = the sender's id (the bank names no
// other object), whose event delivers once; the same id again answers `{ seen: true }` and writes nothing, whatever
// its fields and wherever the world was killed between; an unknown mount is 404 and a GET is 405.
//
// Red today on the missing surface only: the bank and the club's blueprint do not load (`Blueprint.door`, `Blueprint.on`,
// `Blueprint.service` do not exist) and the Worker has no `/_in/` route. Turns green with M5.03 (and M5.04 for the
// delivery: `quiet` waits on `/_world/outbox`).
import { afterAll, describe, expect, it } from "vitest";
import { post, rawOf, signed } from "./door.ts";
import { club, generated, nothingRunning } from "./support.ts";
import { call, journalOf, launchWorld, outboxOf, quiet, record, trace, type Live } from "./world.ts";

const copy = club("in", { bank: true });
let live: Promise<Live> | undefined;
/** The one world of this file, started by the first test that needs it: a failure to start fails that test, not a hook. */
const world = () => (live ??= (async () => launchWorld(generated(copy.root), "events-door"))());
afterAll(async () => {
  if (live) await (await live.catch(() => undefined))?.stop();
  nothingRunning(copy.root);
  copy.remove();
});

const started = async (url: string) => {
  const made = await call(url, "payment.start", { amount: "2000" });
  expect(made.status, JSON.stringify(made.body)).toBe(200);
  return String(made.body["payment"]);
};
const checkout = (payment: string, intent: string, id: string) => rawOf(id, "checkoutCompleted", { reference: payment, intent });
const held = async (url: string, payment: string) => {
  const row = await record(url, "payment", payment);
  return [row?.["intent"], row?.["state"]];
};
const SILENT = { pending: 0, claimed: 0, failed: [], refused: [] };

describe("03 M5.03: the door", () => {
  it("an accepted event writes one inbox row in its trace, then settles the payment once, called by the bank", async () => {
    const { url } = await world();
    const payment = await started(url);
    const t = trace();
    const answer = await post(url, checkout(payment, "pi_door", "evt_door_1"), { trace: t.header });
    expect([answer.status, answer.body]).toEqual([200, { accepted: true }]);
    expect(await quiet(url)).toEqual(SILENT);
    expect(await held(url, payment)).toEqual(["pi_door", "settled"]);
    const rows = await journalOf(url, t.id);
    expect(rows.map((r) => [r.id, r.operation, r.event, r.subject])).toEqual([
      ["bank:evt_door_1", "in:bank", "checkoutCompleted", "evt_door_1"],
      [rows[1]!.id, "payment.settle", "PaymentSettled", payment],
    ]);
    expect(rows[0]!.fields).toEqual({ reference: payment, intent: "pi_door" });
    expect(rows[1]!.id).toMatch(/^evt_/);
  });

  it("the same event id again, even with other fields, is seen: nothing written, nothing delivered, the first fields stand", async () => {
    const { url } = await world();
    const payment = await started(url);
    expect((await post(url, checkout(payment, "pi_first", "evt_door_2"))).body).toEqual({ accepted: true });
    expect(await quiet(url)).toEqual(SILENT);
    for (const [intent, at] of [["pi_first", 0], ["pi_other", 2]] as const) {
      const t = trace();
      const again = await post(url, checkout(payment, intent, "evt_door_2"), { trace: t.header, signature: signed(checkout(payment, intent, "evt_door_2"), { at: Math.floor(Date.now() / 1000) + at }) });
      expect([again.status, again.body], intent).toEqual([200, { seen: true }]);
      expect(await journalOf(url, t.id), intent).toEqual([]);
    }
    expect(await quiet(url)).toEqual(SILENT);
    expect(await held(url, payment)).toEqual(["pi_first", "settled"]);
  });

  it("five identical requests at once: one accepted, four seen, and one settlement", async () => {
    const { url } = await world();
    const payment = await started(url);
    const t = trace();
    const raw = checkout(payment, "pi_five", "evt_door_3");
    const answers = await Promise.all([0, 1, 2, 3, 4].map(() => post(url, raw, { trace: t.header })));
    expect(answers.map((a) => a.status)).toEqual([200, 200, 200, 200, 200]);
    expect(answers.map((a) => Object.keys(a.body).join()).sort()).toEqual(["accepted", "seen", "seen", "seen", "seen"]);
    expect(await quiet(url)).toEqual(SILENT);
    expect((await journalOf(url, t.id)).map((r) => r.event)).toEqual(["checkoutCompleted", "PaymentSettled"]);
    expect(await held(url, payment)).toEqual(["pi_five", "settled"]);
  });

  it("every way to a bad signature is refused 401 BadSignature and writes nothing, and the id is not used up", async () => {
    const { url } = await world();
    const payment = await started(url);
    const raw = checkout(payment, "pi_bad", "evt_door_4");
    const now = Math.floor(Date.now() / 1000);
    const forged = signed(raw, { secret: "whsec_not_the_one" });
    const cases: ReadonlyArray<readonly [string, string, string | null]> = [
      ["no signature header", raw, null],
      ["a header that is not a signature", raw, "garbage"],
      ["another secret", raw, forged],
      ["an hour old", raw, signed(raw, { at: now - 3600 })],
      ["an hour from now", raw, signed(raw, { at: now + 3600 })],
      ["a body altered after signing", checkout(payment, "pi_evil", "evt_door_4"), signed(raw)],
      ["a time changed after signing", raw, signed(raw, { at: now - 5 }).replace(/^t=\d+/, `t=${now}`)],
    ];
    for (const [what, body, signature] of cases) {
      const t = trace();
      const answer = await post(url, body, { signature, trace: t.header });
      expect([answer.status, answer.body], what).toEqual([401, { _tag: "BadSignature" }]);
      expect(await journalOf(url, t.id), what).toEqual([]);
    }
    expect(await outboxOf(url)).toEqual(SILENT);
    expect(await held(url, payment)).toEqual(["", "pending"]);
    expect((await post(url, raw)).body).toEqual({ accepted: true });
    expect(await quiet(url)).toEqual(SILENT);
    expect(await held(url, payment)).toEqual(["pi_bad", "settled"]);
  });

  it("an event the mount leaves out, a type nobody knows, and an included event that does not decode are answered 200 ignored and kept nowhere", async () => {
    const { url } = await world();
    const payment = await started(url);
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["left out by the mount", rawOf("evt_door_5", "chargeRefunded", { reference: payment, amount: "500" })],
      ["a type nobody knows", rawOf("evt_door_5", "somethingElse", { reference: payment })],
      ["included but missing a field", rawOf("evt_door_5", "checkoutCompleted", { reference: payment })],
      ["included but a field of the wrong kind", rawOf("evt_door_5", "checkoutCompleted", { reference: payment, intent: 7 })],
    ];
    for (const [what, raw] of cases) {
      const t = trace();
      const answer = await post(url, raw, { trace: t.header });
      expect([answer.status, answer.body], what).toEqual([200, { ignored: true }]);
      expect(await journalOf(url, t.id), what).toEqual([]);
    }
    expect(await outboxOf(url)).toEqual(SILENT);
    expect((await post(url, checkout(payment, "pi_ok", "evt_door_5"))).body).toEqual({ accepted: true });
    expect(await quiet(url)).toEqual(SILENT);
    expect(await held(url, payment)).toEqual(["pi_ok", "settled"]);
  });

  it("a mount that is not there is 404 and a GET is 405, whoever signed it", async () => {
    const { url } = await world();
    const raw = rawOf("evt_door_7", "checkoutCompleted", { reference: "pay_x", intent: "pi_x" });
    expect((await post(url, raw, { mount: "nobody" })).status).toBe(404);
    expect((await post(url, raw, { method: "GET" })).status).toBe(405);
  });

  it("an event seen before a kill is still seen after the restart: a webhook sent twice settles once", async () => {
    const live1 = await world();
    const payment = await started(live1.url);
    const raw = checkout(payment, "pi_kill", "evt_door_8");
    expect((await post(live1.url, raw)).body).toEqual({ accepted: true });
    expect(await quiet(live1.url)).toEqual(SILENT);
    await live1.kill();
    await live1.restart();
    const t = trace();
    const again = await post(live1.url, raw, { trace: t.header });
    expect([again.status, again.body]).toEqual([200, { seen: true }]);
    expect(await journalOf(live1.url, t.id)).toEqual([]);
    expect(await quiet(live1.url)).toEqual(SILENT);
    expect(await held(live1.url, payment)).toEqual(["pi_kill", "settled"]);
  });

  it("an event for a payment that does not exist is accepted, and its delivery is refused with PaymentNotFound and never retried", async () => {
    const { url } = await world();
    const answer = await post(url, checkout("pay_nobody", "pi_none", "evt_door_6"));
    expect([answer.status, answer.body]).toEqual([200, { accepted: true }]);
    const settled = await quiet(url);
    expect(settled.failed).toEqual([]);
    expect(settled.refused).toEqual([{ event: "bank:evt_door_6", to: "op:payment.settle", attempts: 1, outcome: "PaymentNotFound" }]);
    // A refusal is an answer: a second look a while later finds it still one try.
    await new Promise<void>((resolve) => { setTimeout(resolve, 5000); });
    expect((await outboxOf(url)).refused.map((r) => r.attempts)).toEqual([1]);
  });
});
