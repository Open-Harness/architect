// J1 (#1190, CX-journey-signs): a journey's cast member signs a message that holds run-time ids, and a later step hands the
// signature to an operation that recovers who signed it. Written by J1's checks author; a builder never edits it.
//
// A world played by a local HTTP server, as `clock-step.test.ts` does: it casts the people with ids of its own making, opens
// a Safe with an id of its own making (`saf_<random>`, so no journey file can hold the text), and, at `safe.claim`, rebuilds
// the claim's text from what it made, recovers the signer from the signature it is handed (viem, EIP-191) and answers it as
// `by`. Three journeys and two runs of the first:
//  - `ada claims her safe` passes whole: ada signs the claim, the claim names her, she signs again with the same key, bo signs too;
//  - `bo signs ada's claim` and `ada signs another text` fail at the claim step only, by the recovered signer;
//  - `a message with a ref the world never gave` fails its sign step, naming the ref, and signs nothing.
// Every expected text, id and address comes from what the world made or from viem's recovery, never from the answer judged. Every key prove
// makes through chain-evm's `Keys.generate` is caught as it is made, and looked for in the runs, prove's printed lines and structured
// details, everything printed or logged, every request the world got and every file written meanwhile: none may hold it.
//
// The surface (`s.<name>.signs`, `s.<name>.signer`) is reached through `Signing`, so this file compiles before the builder adds it.
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Effect, Redacted } from "effect";
import { getAddress, recoverMessageAddress } from "viem";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Blueprint, expect as check } from "orthograph";
import { Keys } from "@orthograph/chain-evm/device";
import { Journeys } from "./service.ts";
import { journeyLines } from "#modules/prove/internal/report.js";
import type { CallRecord, JourneyRun } from "./types.ts";

/** What CX-journey-signs adds to a cast member, as a script sees them. */
interface Signing {
  readonly signs: { (strings: TemplateStringsArray, ...values: ReadonlyArray<unknown>): never; (message: string | ReadonlyArray<unknown>): never };
  readonly signer: unknown;
}
const as = (actor: unknown) => actor as Signing;

// ---- the declarations the journeys call ----------------------------------------------------------------------------
const Safe = Blueprint.thing({ description: "A person's Safe, before it is claimed.", fields: { id: Blueprint.id("saf"), by: Blueprint.text() } });
const open = Blueprint.operation(Safe, { description: "Open a Safe.", payload: {}, answer: { safe: Safe.fields.id }, allowed: [Blueprint.signedIn] });
const claim = Blueprint.operation(Safe, {
  description: "Claim a Safe with a signature of its claim text.", payload: { safe: Safe.fields.id, signature: Safe.fields.by },
  answer: { by: Safe.fields.by }, allowed: [Blueprint.signedIn],
});

// ---- the world -----------------------------------------------------------------------------------------------------
const word = () => randomBytes(6).toString("hex");
/** Who the world cast, by token: their person id. */
const people = new Map<string, string>();
/** Who the world cast, by the name prove asked for (`j<index>.<name>`): their person id. */
const castAs = new Map<string, string>();
/** Each Safe the world opened: the person who opened it. */
const safes = new Map<string, string>();
/** Each claim the world was handed: the text it rebuilt, the signature, and who it recovered. */
const claims: Array<{ readonly safe: string; readonly text: string; readonly signature: string; readonly by: string }> = [];
/** Every request the world got: its path and body, as sent. */
const requests: Array<{ readonly path: string; readonly body: string; readonly authorization: string }> = [];

const bodyOf = (request: IncomingMessage) =>
  new Promise<string>((done) => { let text = ""; request.on("data", (c: Buffer) => (text += c.toString())); request.on("end", () => done(text)); });

const server = createServer((request, response) => {
  void bodyOf(request).then(async (body) => {
    const path = (request.url ?? "").split("?")[0]!;
    const authorization = String(request.headers.authorization ?? "");
    requests.push({ path, body, authorization });
    const json = (status: number, answer: unknown) => response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(answer));
    const asked = (body === "" ? {} : JSON.parse(body)) as Record<string, unknown>;
    if (path === "/_world/cast") {
      const names = [...((asked["names"] as ReadonlyArray<string>) ?? []), ...((asked["anonymous"] as ReadonlyArray<string>) ?? [])];
      return json(200, Object.fromEntries(names.map((name) => {
        const person = `per_${word()}`;
        const token = `tok_${word()}`;
        people.set(token, person);
        castAs.set(name, person);
        return [name, { person, token, email: `${name}@world.test`, password: "world-password" }];
      })));
    }
    const caller = people.get(authorization.replace(/^Bearer /, ""));
    if (path === "/safe/open") {
      if (caller === undefined) return json(401, { _tag: "NotSignedIn" });
      const safe = `saf_${word()}`;
      safes.set(safe, caller);
      return json(200, { safe });
    }
    if (path === "/safe/claim") {
      const safe = String(asked["safe"]);
      const owner = safes.get(safe);
      if (caller === undefined || owner === undefined) return json(404, { _tag: "SafeNotFound" });
      const text = `Capxul: claim Safe ${safe} for ${owner}`;
      const signature = String(asked["signature"]);
      const by = await recoverMessageAddress({ message: text, signature: signature as `0x${string}` }).catch(() => undefined);
      if (by === undefined) return json(422, { _tag: "BadSignature" });
      claims.push({ safe, text, signature, by });
      return json(200, { by });
    }
    return json(404, { error: "not found" });
  });
});
let url = "";

// ---- catching every key prove makes, and everything said meanwhile -----------------------------------------------
const made: Array<Redacted.Redacted<string>> = [];
const original = Keys.generate;
const said: Array<string> = [];
const restore: Array<() => void> = [];
let started = 0;

beforeAll(async () => {
  started = Date.now();
  (Keys as { generate: typeof Keys.generate }).generate = Effect.tap(original, (secret) => Effect.sync(() => { made.push(secret); }));
  for (const method of ["log", "info", "warn", "error", "debug", "trace"] as const) {
    const was = console[method];
    console[method] = (...args: ReadonlyArray<unknown>) => { said.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a, wire))).join(" ")); };
    restore.push(() => { console[method] = was; });
  }
  for (const stream of [process.stdout, process.stderr]) {
    const was = stream.write.bind(stream);
    stream.write = ((chunk: unknown, ...rest: ReadonlyArray<unknown>) => { said.push(String(chunk)); return (was as (...a: ReadonlyArray<unknown>) => boolean)(chunk, ...rest); }) as typeof stream.write;
    restore.push(() => { stream.write = was as typeof stream.write; });
  }
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", () => { url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; done(); }));
});
afterAll(async () => {
  for (const undo of restore.splice(0)) undo();
  (Keys as { generate: typeof Keys.generate }).generate = original;
  await new Promise<void>((done) => server.close(() => done()));
});

function wire(_: string, v: unknown) { return typeof v === "bigint" ? v.toString() : v; }

// ---- the journeys --------------------------------------------------------------------------------------------------
const aSafe = Blueprint.startingWorld("a safe", {
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [s.ada.run(open, {})],
  gives: (s) => ({ safe: s.last.safe }),
});

const claims0 = Blueprint.journey("ada claims her safe", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a safe",
  steps: (s) => [
    s.step("ada signs the claim", as(s.ada).signs`Capxul: claim Safe ${s.world.safe} for ${s.ada.person}`, check((a) => a.signer).toBe(as(s.ada).signer)),
    s.step("the claim names ada", s.ada.run(claim, { safe: s.world.safe, signature: s.last.signature }), check((a) => a.by).toBe(as(s.ada).signer)),
    s.step("ada signs again, with the same key", as(s.ada).signs("hello, Capxul"), check((a) => a.signer).toBe(as(s.ada).signer)),
    s.step("bo signs too", as(s.bo).signs`I am ${s.bo.person}`, check((a) => a.signer).toBe(as(s.bo).signer)),
    s.step("ada signs the claim again, as parts", as(s.ada).signs(["Capxul: claim Safe ", s.world.safe, " for ", s.ada.person]), check((a) => a.signer).toBe(as(s.ada).signer)),
  ],
});
const another = Blueprint.journey("bo signs ada's claim", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a safe",
  steps: (s) => [
    s.step("bo signs ada's claim text", as(s.bo).signs`Capxul: claim Safe ${s.world.safe} for ${s.ada.person}`, check((a) => a.signer).toBe(as(s.bo).signer)),
    s.step("the claim names ada", s.ada.run(claim, { safe: s.world.safe, signature: s.last.signature }), check((a) => a.by).toBe(as(s.ada).signer)),
  ],
});
const otherText = Blueprint.journey("ada signs another text", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a safe",
  steps: (s) => [
    s.step("ada signs a claim for bo", as(s.ada).signs`Capxul: claim Safe ${s.world.safe} for ${s.bo.person}`, check((a) => a.signer).toBe(as(s.ada).signer)),
    s.step("the claim names ada", s.ada.run(claim, { safe: s.world.safe, signature: s.last.signature }), check((a) => a.by).toBe(as(s.ada).signer)),
  ],
});
/** A world that begins from `a safe`: ada signs the claim in `makes`, then claims with `s.last`, and the world gives who it recovered. */
const aClaimedSafe = Blueprint.startingWorld("a claimed safe", {
  from: "a safe",
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [
    as(s.ada).signs`Capxul: claim Safe ${s.world.safe} for ${s.ada.person}`,
    s.ada.run(claim, { safe: s.world.safe, signature: s.last.signature }),
  ],
  gives: (s) => ({ safe: s.world.safe, claimedBy: s.last.by }),
});
const onClaimed = Blueprint.journey("ada's key in the world is hers in the journey", {
  // bo is here so that a world signing with someone else's key has someone else's key to sign with.
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a claimed safe",
  steps: (s) => [s.step("ada signs once the world has claimed", as(s.ada).signs("hello, Capxul"), check((a) => a.signer).toBe(s.world.claimedBy), check((a) => a.signer).toBe(as(s.ada).signer))],
});
/** A world whose sign names a ref the world never gave: the journey must stop on it, never run on a claim of nothing. */
const aClaimOfNothing = Blueprint.startingWorld("a claim of nothing", {
  from: "a safe",
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [as(s.ada).signs`Capxul: claim Safe ${s.world.nope} for ${s.ada.person}`],
  gives: (s) => ({ safe: s.world.safe }),
});
const onNothing = Blueprint.journey("a journey on a world that signed nothing", {
  cast: { ada: Blueprint.signedIn },
  starts: "a claim of nothing",
  steps: (s) => [s.step("ada signs once the world has claimed nothing", as(s.ada).signs("hello, Capxul"))],
});
const keyless = Blueprint.journey("the system has no key", {
  cast: { ada: Blueprint.signedIn, sys: Blueprint.system },
  steps: (s) => [s.step("the system tries to sign", as(s.sys).signs("hello, Capxul"))],
});
const unsaid = Blueprint.journey("a message with a ref the world never gave", {
  cast: { ada: Blueprint.signedIn },
  starts: "a safe",
  steps: (s) => [s.step("ada signs a claim of nothing", as(s.ada).signs`Capxul: claim Safe ${s.last.nope} for ${s.ada.person}`)],
});

const project = {
  root: "", model: { operations: {} },
  operations: new Map<string, unknown>([["safe.open", open], ["safe.claim", claim]]),
  things: new Map<string, unknown>([["safe", Safe]]),
  journeys: [], startingWorlds: new Map<string, unknown>([["a safe", aSafe], ["a claimed safe", aClaimedSafe], ["a claim of nothing", aClaimOfNothing]]),
} as never;
const facts = { record: () => Effect.succeed(null), journal: () => Effect.succeed([]) } as never;

const runOf = (journey: unknown, index: number) => Effect.runPromise(Journeys.run(project, url, journey as never, index, "world", facts));
/** Every run, once, in order: the four journeys, the first again as another journey of the same run, then the claimed world's, the keyless one and the one on a world that signed nothing. */
let runs: ReadonlyArray<JourneyRun> = [];
const ran = async () => {
  if (runs.length === 0) runs = [await runOf(claims0, 0), await runOf(another, 1), await runOf(otherText, 2), await runOf(unsaid, 3), await runOf(claims0, 4), await runOf(onClaimed, 5), await runOf(keyless, 6), await runOf(onNothing, 7)];
  return runs;
};

// ---- reading what came back ----------------------------------------------------------------------------------------
const SIGNS = new Set(["ada signs the claim again, as parts", "ada signs once the world has claimed", "the system tries to sign", "ada signs the claim", "ada signs again, with the same key", "bo signs too", "bo signs ada's claim text", "ada signs a claim for bo", "ada signs a claim of nothing"]);
/** A step's own call, by its title: the record of what it did. */
const recordOf = (run: JourneyRun, step: string): CallRecord | undefined => run.calls.find((c) => c.step === step);
/** The answer a sign step recorded, or what is wrong with its record. */
const answerOf = (run: JourneyRun, step: string) => {
  const record = recordOf(run, step);
  expect(record, `journey "${run.name}" step "${step}": no call recorded for it; calls: ${run.calls.map((c) => `${c.step} (${c.operation} ${c.status})`).join(", ")}`).toBeDefined();
  expect(record!.status, `journey "${run.name}" step "${step}": expected a signature, recorded ${record!.status} ${JSON.stringify(record!.body)}`).toBe(200);
  return record!.body as { readonly message: string; readonly signature: `0x${string}`; readonly signer: string };
};
/** The run's index among the runs: prove casts journey `index`'s people as `j<index>.<name>`. */
const indexOf = (run: JourneyRun) => runs.indexOf(run);
/** The person id the world gave each name in a run, from the world's own cast. */
const personsIn = (run: JourneyRun) => ({ ada: castAs.get(`j${indexOf(run)}.ada`), bo: castAs.get(`j${indexOf(run)}.bo`) });
/** The Safe the starting world opened for a run: the one its ada opened. */
const safeOf = (run: JourneyRun) => [...safes].find(([, owner]) => owner === personsIn(run).ada)?.[0];
const stepOf = (run: JourneyRun, title: string) => run.steps.find((s) => s.title === title);

describe("a journey's cast member signs a message with run-time ids (CX-journey-signs)", () => {
  it("ada claims her safe: every step passes, with no failure and no finding", async () => {
    const [run] = await ran();
    expect(run!.stopped, `journey "${run!.name}" stopped: ${run!.stopped}`).toBeUndefined();
    expect(run!.steps.map((s) => [s.title, s.failures]), `journey "${run!.name}"`).toEqual([
      ["ada signs the claim", []], ["the claim names ada", []], ["ada signs again, with the same key", []], ["bo signs too", []],
      ["ada signs the claim again, as parts", []],
    ]);
  });

  it("the sign step answers exactly { message, signature, signer }: the text with the world's ids, EIP-191 by ada's key, her address checksummed", async () => {
    const [run] = await ran();
    const answer = answerOf(run!, "ada signs the claim");
    const safe = safeOf(run!);
    expect(safe, "the world opened a Safe for this run's ada").toBeDefined();
    const text = `Capxul: claim Safe ${safe} for ${personsIn(run!).ada}`;
    expect(Object.keys(answer).sort(), `journey "${run!.name}" step "ada signs the claim": the answer's fields`).toEqual(["message", "signature", "signer"]);
    expect(answer.message, "the message signed: the template with the world's ids").toBe(text);
    expect(answer.signature, "an EIP-191 signature: 0x and 130 lower-case hex digits").toMatch(/^0x[0-9a-f]{130}$/);
    expect(answer.signer, "the signer, EIP-55 checksummed").toBe(getAddress(answer.signer));
    expect(await recoverMessageAddress({ message: text, signature: answer.signature }), "who the signature recovers to, over the expected text").toBe(answer.signer);
  });

  it("a later step hands the signature to the world, which recovers ada: the same signature, the world's own text, her address", async () => {
    const [run] = await ran();
    const answer = answerOf(run!, "ada signs the claim");
    const safe = safeOf(run!);
    const handed = claims.filter((c) => c.safe === safe);
    expect(handed.map((c) => c.signature), "the signatures the world was handed for this run's Safe").toEqual([answer.signature]);
    expect(handed[0]!.by, "who the world recovered").toBe(answer.signer);
    expect(recordOf(run!, "the claim names ada")!.body, "the claim's answer").toEqual({ by: answer.signer });
  });

  it("each person has one key in a journey: ada's two signatures recover to her address, bo's to another", async () => {
    const [run] = await ran();
    const first = answerOf(run!, "ada signs the claim");
    const again = answerOf(run!, "ada signs again, with the same key");
    const bo = answerOf(run!, "bo signs too");
    expect(again.message).toBe("hello, Capxul");
    expect(await recoverMessageAddress({ message: "hello, Capxul", signature: again.signature })).toBe(first.signer);
    expect(bo.message).toBe(`I am ${personsIn(run!).bo}`);
    expect(await recoverMessageAddress({ message: bo.message, signature: bo.signature })).toBe(bo.signer);
    expect(bo.signer, "bo's key is not ada's").not.toBe(first.signer);
  });

  it("one key and one text give one signature: the claim signed again, as a parts array, is the very same signature", async () => {
    const [run] = await ran();
    const first = answerOf(run!, "ada signs the claim");
    const again = answerOf(run!, "ada signs the claim again, as parts");
    expect(again.message, "the parts array joined is the template's text").toBe(first.message);
    expect(again.signature, "a deterministic signature (RFC 6979): a replayed claim carries the same proof").toBe(first.signature);
    expect(again.signer).toBe(first.signer);
  });

  it("a starting world signs in its makes, s.last moving to the claim, and ada's key there is her key in the journey", async () => {
    const all = await ran();
    const run = all[5]!;
    expect(run.stopped, `journey "${run.name}" stopped: ${run.stopped}`).toBeUndefined();
    expect(run.steps.map((s) => [s.title, s.failures]), `journey "${run.name}"`).toEqual([["ada signs once the world has claimed", []]]);
    const safe = safeOf(run);
    const handed = claims.filter((c) => c.safe === safe);
    expect(handed.map((c) => c.text), "the world was handed one claim, over its own text").toEqual([`Capxul: claim Safe ${safe} for ${personsIn(run).ada}`]);
    const signed = answerOf(run, "ada signs once the world has claimed");
    expect(handed[0]!.by, "who the world recovered in the starting world is who signs in the journey").toBe(signed.signer);
    expect(await recoverMessageAddress({ message: "hello, Capxul", signature: signed.signature })).toBe(signed.signer);
  });

  it("a starting world whose sign names a ref the world never gave stops the journey, naming the world and the ref", async () => {
    const all = await ran();
    const run = all[7]!;
    expect(run.stopped, `journey "${run.name}"`).toMatch(/^starting world a claim of nothing: .*\bnothing at world\.nope\b/);
    expect(run.steps, "no step ran").toEqual([]);
    expect(JSON.stringify(run, wire), "no signature in the run").not.toMatch(/0x[0-9a-fA-F]{130}/);
  });

  it("a cast member with no key, the system, cannot sign: the step fails, naming them, and nothing is signed", async () => {
    const all = await ran();
    const run = all[6]!;
    expect(run.stopped, `journey "${run.name}" stopped: ${run.stopped}`).toBeUndefined();
    const failures = stepOf(run, "the system tries to sign")?.failures ?? [];
    expect(failures, `journey "${run.name}" step "the system tries to sign"`).toHaveLength(1);
    expect(failures[0], "the failure names the cast member and that it holds no key").toMatch(/\bsys\b.*\bno key\b/);
    expect(JSON.stringify(run, wire), "no signature in the run").not.toMatch(/0x[0-9a-fA-F]{130}/);
  });

  it("the same name in another journey is another person, with another key", async () => {
    const all = await ran();
    const ada0 = answerOf(all[0]!, "ada signs the claim").signer;
    const ada4 = answerOf(all[4]!, "ada signs the claim").signer;
    const bo0 = answerOf(all[0]!, "bo signs too").signer;
    const bo4 = answerOf(all[4]!, "bo signs too").signer;
    expect(new Set([ada0, ada4, bo0, bo4]).size, `four keys for ada and bo in two journeys: ${[ada0, ada4, bo0, bo4].join(", ")}`).toBe(4);
    expect(all[4]!.steps.flatMap((s) => s.failures), `journey "${all[4]!.name}", run again`).toEqual([]);
  });

  it("every key that signs is a world key prove made for the run, through Keys.generate: a fixed or real key is none of them", async () => {
    const all = await ran();
    const signers = new Set(all.flatMap((run) => run.calls.filter((c) => SIGNS.has(c.step) && c.status === 200).map((c) => (c.body as { signer: string }).signer)));
    expect(signers.size, "the signers of the passing journeys' sign steps").toBeGreaterThanOrEqual(4);
    const addresses = new Set(await Promise.all(made.map((secret) => Effect.runPromise(Keys.fromSecret(secret).pipe(Effect.map((k) => k.address))))));
    expect([...signers].filter((s) => !addresses.has(s as `0x${string}`)), "signers whose key prove did not make with Keys.generate").toEqual([]);
  });

  it("a sign step asks the world nothing: the world got the cast, the clock, and the journeys' own calls only", async () => {
    const all = await ran();
    const paths = requests.map((r) => r.path);
    expect([...new Set(paths)].filter((p) => !["/_world/cast", "/_world/clock", "/safe/open", "/safe/claim"].includes(p)), "paths the world was asked").toEqual([]);
    const claimSteps = all.flatMap((run) => run.steps.filter((s) => s.title === "the claim names ada")).length;
    // and one for each journey that starts on `a claimed safe`, whose makes claims once.
    const worldClaims = all.filter((run) => run.name === onClaimed.name).length;
    expect(paths.filter((p) => p === "/safe/claim").length, "one claim request per claim step, and per claimed world").toBe(claimSteps + worldClaims);
  });

  it("prove's printed lines pass the signing journey whole: a sign step waits for no span", async () => {
    const all = await ran();
    // Each operation's call gets a span, as a world's collector would give it; a sign step's trace gets none.
    const traces = new Map(all.flatMap((run) => run.steps.filter((s) => !SIGNS.has(s.title)).map((s) => [s.trace, { spans: [{ name: "safe.claim", attrs: {} }], logs: [] }] as const)));
    const printed = journeyLines([all[0]!], traces as never);
    expect(printed.lines, printed.lines.join("\n")).toEqual(["journey ada claims her safe ✔ 5/5 steps"]);
  });
});

describe("a signature for another text, or by another person, fails the check that reads it", () => {
  it("bo signs ada's claim: his sign step passes, and the claim step fails, the world having recovered bo, not ada", async () => {
    const [, run] = await ran();
    expect(run!.stopped, `journey "${run!.name}" stopped: ${run!.stopped}`).toBeUndefined();
    const bo = answerOf(run!, "bo signs ada's claim text");
    expect(bo.message).toBe(`Capxul: claim Safe ${safeOf(run!)} for ${personsIn(run!).ada}`);
    expect(stepOf(run!, "bo signs ada's claim text")?.failures, `journey "${run!.name}" step "bo signs ada's claim text"`).toEqual([]);
    const failures = stepOf(run!, "the claim names ada")?.failures ?? [];
    expect(failures, `journey "${run!.name}" step "the claim names ada"`).toHaveLength(1);
    const [, got, wanted] = /^answer "(0x[0-9a-fA-F]{40})", expected "(0x[0-9a-fA-F]{40})"$/.exec(failures[0]!) ?? [];
    expect(got, `the failure names what came back: ${failures[0]}`).toBe(bo.signer);
    expect(wanted, "and what was expected: ada's address, not bo's").not.toBe(bo.signer);
    expect(claims.find((c) => c.signature === bo.signature)?.by, "who the world recovered").toBe(bo.signer);
  });

  it("ada signs another text: the claim step fails, the world's own text recovering someone who is not ada", async () => {
    const [, , run] = await ran();
    expect(run!.stopped, `journey "${run!.name}" stopped: ${run!.stopped}`).toBeUndefined();
    const ada = answerOf(run!, "ada signs a claim for bo");
    expect(ada.message).toBe(`Capxul: claim Safe ${safeOf(run!)} for ${personsIn(run!).bo}`);
    expect(stepOf(run!, "ada signs a claim for bo")?.failures, `journey "${run!.name}" step "ada signs a claim for bo"`).toEqual([]);
    const failures = stepOf(run!, "the claim names ada")?.failures ?? [];
    expect(failures, `journey "${run!.name}" step "the claim names ada"`).toHaveLength(1);
    const [, got, wanted] = /^answer "(0x[0-9a-fA-F]{40})", expected "(0x[0-9a-fA-F]{40})"$/.exec(failures[0]!) ?? [];
    expect(wanted, `the failure names ada's address as expected: ${failures[0]}`).toBe(ada.signer);
    expect(got, "and someone else as what came back").not.toBe(ada.signer);
  });

  it("a ref the world never gave fails the sign step, naming the ref, and nothing is signed", async () => {
    const [, , , run] = await ran();
    expect(run!.stopped, `journey "${run!.name}" stopped: ${run!.stopped}`).toBeUndefined();
    const failures = stepOf(run!, "ada signs a claim of nothing")?.failures ?? [];
    expect(failures, `journey "${run!.name}" step "ada signs a claim of nothing"`).toEqual(["message: nothing at last.nope"]);
    expect(JSON.stringify(run, wire), "no signature in the run").not.toMatch(/0x[0-9a-fA-F]{130}/);
  });
});

// ---- no key anywhere -----------------------------------------------------------------------------------------------
const repo = resolve(import.meta.dirname, "../../../../..");
const SKIP = new Set(["node_modules", ".git", ".nx", ".pnpm-store"]);
/** Every file under `root` written since the runs began, up to a few megabytes each. */
const writtenSince = (root: string, since: number): ReadonlyArray<string> => {
  const out: Array<string> = [];
  const walk = (dir: string) => {
    let entries: ReadonlyArray<string> = [];
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (SKIP.has(name)) continue;
      const path = join(dir, name);
      let stat;
      try { stat = statSync(path); } catch { continue; }
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile() && stat.mtimeMs >= since && stat.size < 8_000_000) out.push(path);
    }
  };
  walk(root);
  return out;
};
/** The ways a key could be written: its hex with or without `0x`, any case, and its bytes in base64. */
const formsOf = (secret: Redacted.Redacted<string>) => {
  const hex = Redacted.value(secret).replace(/^0x/, "").toLowerCase();
  return [hex, Buffer.from(hex, "hex").toString("base64")];
};
const holds = (text: string, forms: ReadonlyArray<string>) => forms.some((form) => text.toLowerCase().includes(form.toLowerCase()));

describe("no key is ever shown (CX-journey-signs, call 5)", () => {
  it("prove made a key for each person who signed", async () => {
    await ran();
    // ada and bo in two journeys of the first kind, bo in the second, ada in the third and in the claimed world: seven at least.
    expect(made.length, "keys made with Keys.generate during the runs").toBeGreaterThanOrEqual(7);
  });

  it("no key is in a run, prove's printed lines, its structured details, or any request the world got", async () => {
    const all = await ran();
    const printed = journeyLines(all, new Map());
    expect(made.length, "keys to look for").toBeGreaterThan(0);
    const texts = [JSON.stringify(all, wire), printed.lines.join("\n"), JSON.stringify(printed.details, wire), ...requests.map((r) => `${r.path} ${r.body}`)];
    const forms = made.flatMap(formsOf);
    expect(texts.filter((t) => holds(t, forms)).map((t) => t.slice(0, 120)), "texts that hold a key").toEqual([]);
    // A key is 64 hex digits; nothing in a run is that long but a signature (130) and nothing that short is a key's (traces are 32).
    expect(texts.flatMap((t) => t.match(/(?<![0-9a-fA-F])(0x)?[0-9a-fA-F]{64}(?![0-9a-fA-F])/g) ?? []), "runs of exactly 64 hex digits").toEqual([]);
  });

  it("no key was printed or logged", async () => {
    await ran();
    const forms = made.flatMap(formsOf);
    expect(made.length, "keys to look for").toBeGreaterThan(0);
    expect(said.filter((t) => holds(t, forms)).map((t) => t.slice(0, 120)), "lines printed or logged that hold a key").toEqual([]);
  });

  it("no key was written to a file, in the repository or the system's temporary folder", async () => {
    await ran();
    const forms = made.flatMap(formsOf);
    expect(made.length, "keys to look for").toBeGreaterThan(0);
    const files = [...writtenSince(repo, started), ...writtenSince(tmpdir(), started)];
    const holding = files.filter((file) => { try { return holds(readFileSync(file, "latin1"), forms); } catch { return false; } });
    expect(holding, "files written during the runs that hold a key").toEqual([]);
  });
});
