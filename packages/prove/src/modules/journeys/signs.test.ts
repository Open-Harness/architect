// J1 (#1190, CX-journey-signs): a journey's cast member signs a message that holds run-time ids, and a later step hands the
// signature to an operation that recovers who signed it. Written by J1's checks author; a builder never edits it.
//
// The journeys and the fake world are in `test/signing/`: the world makes the ids, so no journey file can hold the text, and
// recovers the signer itself (noble's secp256k1, EIP-191). Every expected text, id and address comes from what the world made
// or from that recovery, never from the answer judged. `signs-keys.test.ts` judges that no key is ever shown.
import { Effect, Redacted } from "effect";
import { describe, expect, it } from "vitest";
import { Keys } from "@orthograph/chain-evm/device";
import { journeyLines } from "#modules/prove/internal/report.js";
import { addressesIn, answerOf, recordOf, RUN, signing, SIGNS, stepOf, wire } from "../../../test/signing/journeys.ts";
import { checksum, recover, reference } from "../../../test/signing/world.ts";

const { made, ran, world, personsIn, safeOf, claimTextOf } = signing();
const runAt = async (index: number) => (await ran())[index]!;
const NO_SIGNATURE = /0x[0-9a-fA-F]{130}/;

describe("a journey's cast member signs a message with run-time ids (CX-journey-signs)", () => {
  it("ada claims her safe: every step passes, with no failure and no finding", async () => {
    const run = await runAt(RUN.claims);
    expect(run.stopped, `journey "${run.name}" stopped: ${run.stopped}`).toBeUndefined();
    expect(run.steps.map((s) => [s.title, s.failures]), `journey "${run.name}"`).toEqual([
      ["ada signs the claim", []], ["the claim names ada", []], ["ada signs again, with the same key", []], ["bo signs too", []],
      ["ada signs the claim again, as parts", []],
    ]);
  });

  it("the sign step answers exactly { message, signature, signer }: the text with the world's ids, EIP-191 by ada's key, her address checksummed", async () => {
    const run = await runAt(RUN.claims);
    const answer = answerOf(run, "ada signs the claim");
    expect(safeOf(RUN.claims), "the world opened a Safe for this run's ada").toBeDefined();
    const text = claimTextOf(RUN.claims);
    expect(Object.keys(answer).sort(), `journey "${run.name}" step "ada signs the claim": the answer's fields`).toEqual(["message", "signature", "signer"]);
    expect(answer.message, "the message signed: the template with the world's ids").toBe(text);
    expect(answer.signature, "an EIP-191 signature: 0x, r and s, and a v of 27 or 28 (1b or 1c), as personal_sign gives").toMatch(/^0x[0-9a-f]{128}(1b|1c)$/);
    expect(answer.signer, "the signer, EIP-55 checksummed").toBe(checksum(answer.signer));
    expect(recover(text, answer.signature), "who the signature recovers to, over the expected text").toBe(answer.signer);
  });

  it("a later step hands the signature to the world, which recovers ada: the same signature, the world's own text, her address", async () => {
    const run = await runAt(RUN.claims);
    const answer = answerOf(run, "ada signs the claim");
    const handed = world().claims.filter((c) => c.safe === safeOf(RUN.claims));
    expect(handed.map((c) => c.signature), "the signatures the world was handed for this run's Safe").toEqual([answer.signature]);
    expect(handed[0]!.by, "who the world recovered").toBe(answer.signer);
    expect(recordOf(run, "the claim names ada")!.body, "the claim's answer").toEqual({ by: answer.signer });
  });

  it("each person has one key in a journey: ada's two signatures recover to her address, bo's to another", async () => {
    const run = await runAt(RUN.claims);
    const first = answerOf(run, "ada signs the claim");
    const again = answerOf(run, "ada signs again, with the same key");
    const bo = answerOf(run, "bo signs too");
    expect(again.message).toBe("hello, Capxul");
    expect(recover("hello, Capxul", again.signature)).toBe(first.signer);
    expect(bo.message).toBe(`I am ${personsIn(RUN.claims).bo}`);
    expect(recover(bo.message, bo.signature)).toBe(bo.signer);
    expect(bo.signer, "bo's key is not ada's").not.toBe(first.signer);
  });

  it("one key and one text give one signature: the claim signed again, as a parts array, is the very same signature", async () => {
    const run = await runAt(RUN.claims);
    const first = answerOf(run, "ada signs the claim");
    const again = answerOf(run, "ada signs the claim again, as parts");
    expect(again.message, "the parts array joined is the template's text").toBe(first.message);
    expect(again.signature, "a deterministic signature (RFC 6979): a replayed claim carries the same proof").toBe(first.signature);
    expect(again.signer).toBe(first.signer);
  });

  it("a starting world signs in its makes, s.last moving to the claim, and ada's key there is her key in the journey", async () => {
    const run = await runAt(RUN.onClaimed);
    expect(run.stopped, `journey "${run.name}" stopped: ${run.stopped}`).toBeUndefined();
    expect(run.steps.map((s) => [s.title, s.failures]), `journey "${run.name}"`).toEqual([["ada signs once the world has claimed", []]]);
    const handed = world().claims.filter((c) => c.safe === safeOf(RUN.onClaimed));
    expect(handed.map((c) => c.text), "the world was handed one claim, over its own text").toEqual([claimTextOf(RUN.onClaimed)]);
    const signed = answerOf(run, "ada signs once the world has claimed");
    expect(handed[0]!.by, "who the world recovered in the starting world is who signs in the journey").toBe(signed.signer);
    expect(recover("hello, Capxul", signed.signature)).toBe(signed.signer);
  });

  it("the message is the text exactly as written, each part as String(part): spaces, a tab, CR LF, a trailing newline, non-ASCII, a number, a bigint, an object", async () => {
    const run = await runAt(RUN.exact);
    expect(run.stopped, `journey "${run.name}" stopped: ${run.stopped}`).toBeUndefined();
    const answer = answerOf(run, "ada signs a text with odd spaces");
    const text = `  Capxul:\r\n  claim  ${String(3)}\t${String(30n)} ${String({ a: 1 })} Ünïcødé ✓ ${safeOf(RUN.exact)}  \n`;
    expect(answer.message, "the message signed").toBe(text);
    expect(recover(text, answer.signature)).toBe(answer.signer);
    expect(stepOf(run, "ada signs a text with odd spaces")?.failures).toEqual([]);
  });

  it("a sign step's checks are run against its answer: one that names bo's address on ada's signature fails, naming both", async () => {
    const run = await runAt(RUN.exact);
    const ada = answerOf(run, "a sign step's check that must fail");
    const failures = stepOf(run, "a sign step's check that must fail")?.failures ?? [];
    expect(failures, `journey "${run.name}" step "a sign step's check that must fail"`).toHaveLength(1);
    const [got, wanted] = addressesIn(failures[0]);
    expect(got, `what came back is ada's signer: ${failures[0]}`).toBe(ada.signer);
    expect(wanted, "what was expected is someone else's address").not.toBe(ada.signer);
    expect(wanted, "and a real address").toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("a way in changes nothing: ada signing by her key's way in is ada, with her own key", async () => {
    const run = await runAt(RUN.exact);
    const by = recordOf(run, "ada signs by her key's way in");
    expect(by?.actor, "the cast member recorded").toBe("ada");
    expect(answerOf(run, "ada signs by her key's way in").signer, "the signer").toBe(answerOf(run, "ada signs a text with odd spaces").signer);
    expect(stepOf(run, "ada signs by her key's way in")?.failures).toEqual([]);
  });

  it("a starting world whose sign names a ref the world never gave stops the journey, naming the world and the ref", async () => {
    const run = await runAt(RUN.onNothing);
    expect(run.stopped, `journey "${run.name}"`).toMatch(/^starting world a claim of nothing: .*\bnothing at world\.nope\b/);
    expect(run.steps, "no step ran").toEqual([]);
    expect(JSON.stringify(run, wire), "no signature in the run").not.toMatch(NO_SIGNATURE);
  });

  it.each([
    ["the system", RUN.keyless, "the system tries to sign", "sys"],
    ["the keeper", RUN.keeper, "the keeper tries to sign", "keeper"],
  ] as const)("a cast member with no key, %s, cannot sign: the step fails, naming them, and nothing is signed", async (_, index, title, name) => {
    const run = await runAt(index);
    expect(run.stopped, `journey "${run.name}" stopped: ${run.stopped}`).toBeUndefined();
    const failures = stepOf(run, title)?.failures ?? [];
    expect(failures, `journey "${run.name}" step "${title}"`).toHaveLength(1);
    expect(failures[0], "the failure names the cast member and that it holds no key").toMatch(new RegExp(`\\b${name}\\b.*\\bno key\\b`));
    expect(JSON.stringify(run, wire), "no signature in the run").not.toMatch(NO_SIGNATURE);
  });

  it("the same name in another journey is another person, with another key", async () => {
    const [first, again] = [await runAt(RUN.claims), await runAt(RUN.again)];
    const keys = [answerOf(first, "ada signs the claim"), answerOf(again, "ada signs the claim"), answerOf(first, "bo signs too"), answerOf(again, "bo signs too")].map((a) => a.signer);
    expect(new Set(keys).size, `four keys for ada and bo in two journeys: ${keys.join(", ")}`).toBe(4);
    expect(again.steps.flatMap((s) => s.failures), `journey "${again.name}", run again`).toEqual([]);
  });

  it("a second prove run of the same journey, under the same index, is other people with other keys", async () => {
    const [first, repeat] = [await runAt(RUN.claims), await runAt(RUN.repeat)];
    expect(repeat.steps.flatMap((s) => s.failures), `journey "${repeat.name}", its second run`).toEqual([]);
    for (const step of ["ada signs the claim", "bo signs too"]) expect(answerOf(repeat, step).signer, step).not.toBe(answerOf(first, step).signer);
  });

  it("every signature is a world key's, made through Keys.generate, and is byte for byte the reference signature of that key over its message", async () => {
    const all = await ran();
    const signed = all.flatMap((run) => run.calls.filter((c) => SIGNS.has(c.step) && c.status === 200).map((c) => c.body as { message: string; signature: string; signer: string }));
    expect(new Set(signed.map((a) => a.signer)).size, "the signers of the sign steps").toBeGreaterThanOrEqual(4);
    const keyOf = new Map<string, string>(await Promise.all(made.map((secret) => Effect.runPromise(Keys.fromSecret(secret).pipe(Effect.map((k) => [k.address, Redacted.value(secret)] as const))))));
    expect(signed.filter((a) => !keyOf.has(a.signer)).map((a) => a.signer), "signers whose key prove did not make with Keys.generate").toEqual([]);
    // EIP-191, RFC 6979, low s and v 27 or 28: what the key itself gives, not merely a signature that recovers.
    expect(signed.filter((a) => keyOf.has(a.signer) && a.signature !== reference(a.message, keyOf.get(a.signer)!)).map((a) => a.signature), "signatures that are not the reference").toEqual([]);
  });

  it("a sign step asks the world nothing: the world got the cast, the clock, and the journeys' own calls only", async () => {
    const all = await ran();
    const paths = world().requests.map((r) => r.path);
    expect([...new Set(paths)].filter((p) => !["/_world/cast", "/_world/clock", "/safe/open", "/safe/claim"].includes(p)), "paths the world was asked").toEqual([]);
    const claimSteps = all.flatMap((run) => run.steps.filter((s) => s.title === "the claim names ada")).length;
    // and one for the journey that starts on `a claimed safe`, whose makes claims once.
    expect(paths.filter((p) => p === "/safe/claim").length, "one claim request per claim step, and one for the claimed world").toBe(claimSteps + 1);
  });

  it("prove's printed lines pass the signing journey whole: a sign step waits for no span", async () => {
    const run = await runAt(RUN.claims);
    // Each operation's call gets a span, as a world's collector would give it; a sign step's trace gets none.
    const traces = new Map(run.steps.filter((s) => !SIGNS.has(s.title)).map((s) => [s.trace, { spans: [{ name: "safe.claim", attrs: {} }], logs: [] }] as const));
    const printed = journeyLines([run], traces as never);
    expect(printed.lines, printed.lines.join("\n")).toEqual(["journey ada claims her safe ✔ 5/5 steps"]);
  });
});

describe("a signature for another text, or by another person, fails the check that reads it", () => {
  it("bo signs ada's claim: his sign step passes, and the claim step fails, the world having recovered bo, not ada", async () => {
    const run = await runAt(RUN.another);
    expect(run.stopped, `journey "${run.name}" stopped: ${run.stopped}`).toBeUndefined();
    const bo = answerOf(run, "bo signs ada's claim text");
    expect(bo.message).toBe(claimTextOf(RUN.another));
    expect(stepOf(run, "bo signs ada's claim text")?.failures, `journey "${run.name}" step "bo signs ada's claim text"`).toEqual([]);
    const failures = stepOf(run, "the claim names ada")?.failures ?? [];
    expect(failures, `journey "${run.name}" step "the claim names ada"`).toHaveLength(1);
    const [got, wanted] = addressesIn(failures[0]);
    expect(got, `the failure names what came back: ${failures[0]}`).toBe(bo.signer);
    expect(wanted, "and what was expected: ada's address, not bo's").not.toBe(bo.signer);
    expect(world().claims.find((c) => c.signature === bo.signature)?.by, "who the world recovered").toBe(bo.signer);
  });

  it("ada signs another text: the claim step fails, the world's own text recovering someone who is not ada", async () => {
    const run = await runAt(RUN.otherText);
    expect(run.stopped, `journey "${run.name}" stopped: ${run.stopped}`).toBeUndefined();
    const ada = answerOf(run, "ada signs a claim for bo");
    expect(ada.message).toBe(claimTextOf(RUN.otherText, "bo"));
    expect(stepOf(run, "ada signs a claim for bo")?.failures, `journey "${run.name}" step "ada signs a claim for bo"`).toEqual([]);
    const failures = stepOf(run, "the claim names ada")?.failures ?? [];
    expect(failures, `journey "${run.name}" step "the claim names ada"`).toHaveLength(1);
    const [got, wanted] = addressesIn(failures[0]);
    expect(wanted, `the failure names ada's address as expected: ${failures[0]}`).toBe(ada.signer);
    expect(got, "and someone else as what came back").not.toBe(ada.signer);
  });

  it("a ref the world never gave fails the sign step, naming the ref, and nothing is signed", async () => {
    const run = await runAt(RUN.unsaid);
    expect(run.stopped, `journey "${run.name}" stopped: ${run.stopped}`).toBeUndefined();
    expect(stepOf(run, "ada signs a claim of nothing")?.failures, `journey "${run.name}" step "ada signs a claim of nothing"`).toEqual(["message: nothing at last.nope"]);
    expect(JSON.stringify(run, wire), "no signature in the run").not.toMatch(NO_SIGNATURE);
  });
});
