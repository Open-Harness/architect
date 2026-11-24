// Check 12 (M1.22): the generated actions of Plugged In, run against a real Plugged In world (workerd and prove's local Collector, no Docker, no
// cloud) through the example's generated SDK. Done-when: an action's `run` that the role check refuses returns the same typed refusal as
// the SDK; `run` turns a declared refusal into the no-write `ActionRefusal` (code and fields kept) and redacts a defect; the host's request
// key reaches the Worker; `needsApproval`, carried through from the model, makes the `defineAction` wrapper ask once, before the Worker is called.
//
// Every operation is run, not a sample of them: each answers what the model says it answers; each refusal the model declares for the example
// is produced through an action and typed; each operation's defect is redacted and its aborted call sends nothing; the reads answer the same
// whoever the caller is.
//
// The host is `projection.ts`'s: `host.call(use, ctx)` runs `use` with the SDK's client as one signed-in person (a token from the world's own
// cast), under the request key `tool:<toolCallId>`, through `runForAction`. "Writes nothing" is read from the world's journal for the call's
// own trace (an event is written only by a commit), and from the world's answers afterwards, never from what `run` returned.
//
// (WEB-actions-projection call 6.) Acme's actions are judged by checks 09 to 11 and 13 (their shape is pinned as syntax, and their requests are read against the SDK's own on a
// sink); a second world would add minutes, not a new kind of fault.
//
// Written before the projection exists: the first test that loads a generated action fails by naming the file.
import { Cause, Effect, Exit, Option } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nothingRunning } from "../layer1/support.ts";
import { proxy, type Proxy } from "../m1/clients.ts";
import * as L from "../m1/loop.ts";
import * as W from "../m1/loop-world.ts";
import { type ActionContext, type ActionOptions, loadActions } from "./contract.ts";
import { type Sdk, actionFile, exampleRoot, hostOf, loadModule, loadSdk, modelAt } from "./projection.ts";
import { expectRedacted, expectRefusal, rejection } from "./support.ts";

const root = exampleRoot("plugged-in");
const model = modelAt(root);
type Fresh = ReturnType<typeof L.freshProject>;
let copy: Fresh;
let loop: W.Loop;
let sdk: Sdk;
let people: Record<string, string>;
const extra: Array<Proxy> = [];

const NAMES = ["ada", "bob", "cy", "dee", "eve", "fay", "own1", "own2", "own3", "own4", "own5", "own6", "own7", "nohandle", "reader"];
beforeAll(async () => {
  copy = L.freshProject(L.requireExample());
  loop = await W.openLoop(copy.root);
  sdk = await loadSdk(root);
  people = await loop.cast(NAMES);
}, 400_000);
afterAll(async () => {
  for (const one of extra) await one.close();
  if (loop !== undefined) await loop.close();
  if (copy !== undefined) { nothingRunning(copy.root); copy.remove(); }
});

/** The action's options for `op`, with a host calling the world as `who` (nobody: a visitor). */
const actionOf = async (op: string, who: string | undefined, via: string = loop.url) => {
  const operation = model.operations[op]!;
  const { options } = await loadModule(root, operation).catch(() => expect.fail(`${op}: ${actionFile(operation)} is missing`));
  const host = await hostOf(sdk, via, who === undefined ? undefined : people[who]);
  return { options: options!(host), host };
};

type SdkCall = (payload: unknown, options?: unknown) => Effect.Effect<unknown, unknown, never>;
const sdkOf = (op: string): SdkCall => (sdk[op.split(".")[0]!] as Record<string, SdkCall>)[op.split(".")[1]!]!;
/** The SDK's own call, as `who`, settled. */
const direct = (op: string, who: string | undefined, payload: unknown, key?: string) =>
  Effect.runPromiseExit(sdkOf(op)(payload, key === undefined ? undefined : { requestKey: key }).pipe(Effect.provide(sdk.layer(loop.url, who === undefined ? undefined : people[who]) as never)));
const directOk = async (op: string, who: string | undefined, payload: unknown, key?: string) => {
  const exit = await direct(op, who, payload, key);
  if (!Exit.isSuccess(exit)) expect.fail(`setup: the SDK's ${op} failed: ${Cause.pretty(exit.cause).slice(0, 200)}`);
  return exit.value as Record<string, unknown>;
};
const claimedBy = async (name: string, who: string) => (await directOk("handle.claim", who, { name }, `setup-${name}`))["handle"] as string;
const resolvedTo = async (name: string) => { const exit = await direct("handle.resolve", undefined, { name }); return Exit.isSuccess(exit) ? (exit.value as { handle: string }).handle : "not found"; };
const NOT_FOUND = "not found";

/** The journal's events for the calls the proxy saw from `before` on, over every trace they made. */
const eventsSince = async (before: number) => {
  const traces = [...new Set(loop.proxy.seen.slice(before).map((s) => s.trace))];
  const entries = (await Promise.all(traces.map((trace) => loop.journal(trace)))).flat();
  return entries.map((e) => e.event).filter((e): e is string => typeof e === "string");
};

/** What an answer must be, from the model: exactly the declared answer's fields, each id with its prefix. */
const answerProblems = (op: string, answer: unknown) => {
  const spec = (model.operations[op] as unknown as { answer: Record<string, { value: { type: string; prefix?: string } }> }).answer;
  if (typeof answer !== "object" || answer === null) return [`${op} answered ${String(answer)}, not an object`];
  const keys = Object.keys(answer).sort();
  const want = Object.keys(spec).sort();
  const problems = keys.join(",") === want.join(",") ? [] : [`${op} answered [${keys.join(", ")}], the model says [${want.join(", ")}]`];
  for (const [field, { value }] of Object.entries(spec)) {
    const got = (answer as Record<string, unknown>)[field];
    if (value.type === "id" && !(typeof got === "string" && got.startsWith(`${value.prefix}_`))) problems.push(`${op}.${field} is ${JSON.stringify(got)}, not an id with the prefix ${value.prefix}_`);
  }
  return problems;
};
/** A successful run: its answer is the model's shape, and it is returned. */
const ok = async (op: string, options: ActionOptions<any, any>, args: unknown, ctx: ActionContext) => {
  const answer = await options.run(args, ctx);
  expect(answerProblems(op, answer)).toEqual([]);
  return answer as Record<string, unknown>;
};

describe("12 M1.22: Plugged In's generated actions, run against a real world", () => {
  it("handle.claim as ada claims once: the answer is the model's, the journal has HandleClaimed, and a visitor resolves the name to it", async () => {
    const { options } = await actionOf("handle.claim", "ada");
    const before = loop.proxy.seen.length;
    const answer = await ok("handle.claim", options, { name: "adaname" }, { caller: "tool", toolCallId: "c-ada-1" });
    expect(await eventsSince(before)).toEqual(["HandleClaimed"]);
    expect(await resolvedTo("adaname")).toBe(answer["handle"]);
  });

  describe("every refusal the model declares is produced through an action, typed, with nothing written", () => {
    const produced = new Set<string>();
    /** Run `op` as `who` through its action and through the SDK; both must be the refusal `tag` with the model's code, and the action's call must have written nothing. */
    const refused = async (op: string, who: string | undefined, args: Record<string, unknown>, tag: string, toolCallId: string) => {
      const code = model.refusals[tag];
      expect(code, `the model gives ${tag} a code`).toMatch(/^[A-Z]{2}-\d{3}$/);
      const exit = await direct(op, who, args);
      const failure = Exit.isFailure(exit) ? Option.getOrUndefined(Cause.findErrorOption(exit.cause)) as ({ _tag?: string; code?: string } & Record<string, unknown>) | undefined : undefined;
      expect([failure?._tag, failure?.code], `the SDK's own answer to ${op}`).toEqual([tag, code]);
      // The refusal's fields, as the SDK carries them (the failure's own fields, bar the Error's), which are the fields the model declares for it.
      const details = Object.fromEntries(Object.entries(failure!).filter(([key]) => !["_tag", "code", "message", "name", "stack", "stacks", "cause"].includes(key)));
      const things = Object.values(model.things);
      const declared = things.map((t) => t.errors[tag]).find((e) => e !== undefined)?.fields;
      // A machine's own refusal (`notFrom`: HandleNotClaimed, LinkNotListed) carries the state it was found in; the model lists no fields for it, so the SDK is the oracle there.
      const machine = things.some((t) => t.machine?.notFrom?.error === tag);
      if (!machine) expect(Object.keys(details).sort(), `${tag}'s fields are the model's`).toEqual(Object.keys(declared ?? {}).sort());
      else expect(Object.keys(details), `${tag}'s fields: the state it was found in`).toEqual(["state"]);
      const { options } = await actionOf(op, who);
      const before = loop.proxy.seen.length;
      const error = await rejection(options.run(args, { caller: "tool", toolCallId }));
      await expectRefusal(error, code!, details);
      expect(await eventsSince(before), `${op} refused as ${tag} committed nothing`).toEqual([]);
      produced.add(tag);
    };

    it("NotAllowed: a stranger releasing, ordering and removing what is not theirs is AR-001 each time; the handle and the link are still there", async () => {
      const id = await claimedBy("roleref", "own1");
      await refused("handle.release", "bob", { handle: id }, "NotAllowed", "c-bob-release");
      expect(await resolvedTo("roleref"), "the handle is still held").toBe(id);
      const link = (await directOk("link.add", "own1", { title: "Mine", url: "https://example.com/m" }, "setup-link-roleref"))["link"] as string;
      await refused("link.order", "bob", { link, position: 0n }, "NotAllowed", "c-bob-order");
      await refused("link.remove", "bob", { link }, "NotAllowed", "c-bob-remove");
      const page = (await directOk("profile.get", undefined, { handle: "roleref" })) as { links?: ReadonlyArray<{ title?: string }> };
      expect((page.links ?? []).map((l) => l.title)).toEqual(["Mine"]);
    });

    it("HandleTaken (HN-001): claiming a name another person holds", async () => {
      const id = await claimedBy("takenname", "own2");
      await refused("handle.claim", "bob", { name: "takenname" }, "HandleTaken", "c-bob-claim");
      expect(await resolvedTo("takenname")).toBe(id);
    });

    it("HandleAlreadyOwned (HN-002) and IdempotencyConflict (AR-002): a second name for one person, and one tool call id used for two different claims", async () => {
      const { options } = await actionOf("handle.claim", "cy");
      const first = await ok("handle.claim", options, { name: "cyname" }, { caller: "tool", toolCallId: "c-cy-1" });
      await expectRefusal(await rejection(options.run({ name: "cyother" }, { caller: "tool", toolCallId: "c-cy-1" })), "AR-002", {});
      produced.add("IdempotencyConflict");
      await refused("handle.claim", "cy", { name: "cyother" }, "HandleAlreadyOwned", "c-cy-2");
      expect(await resolvedTo("cyother")).toBe(NOT_FOUND);
      expect(await resolvedTo("cyname")).toBe(first["handle"]);
    });

    it("HandleNotFound (HN-003) and ProfileNotFound (PR-001): reading a name nobody holds", async () => {
      await refused("handle.resolve", undefined, { name: "nosuchname" }, "HandleNotFound", "c-nf-1");
      await refused("profile.get", undefined, { handle: "nosuchname" }, "ProfileNotFound", "c-nf-2");
    });

    it("HandleNotClaimed (HN-900), LinkNotListed (LN-900), LinkAlreadyRemoved (LN-002) and LinkNeedsHandle (LN-001): acting on what is already gone, or on a page one does not have", async () => {
      const id = await claimedBy("goneone", "own3");
      const link = (await directOk("link.add", "own3", { title: "Gone", url: "https://example.com/g" }, "setup-gone"))["link"] as string;
      await directOk("link.remove", "own3", { link });
      await refused("link.remove", "own3", { link }, "LinkNotListed", "c-gone-1");
      await refused("link.order", "own3", { link, position: 0n }, "LinkAlreadyRemoved", "c-gone-2");
      await directOk("handle.release", "own3", { handle: id });
      await refused("handle.release", "own3", { handle: id }, "HandleNotClaimed", "c-gone-3");
      await refused("link.add", "nohandle", { title: "Nowhere", url: "https://example.com/n" }, "LinkNeedsHandle", "c-gone-4");
    });

    it("no refusal of the model is left unproduced: the tags above are every tag the model gives an operation of the example", () => {
      const declared = [...new Set(Object.values(model.operations).flatMap((op) => op.refusals))].sort();
      expect([...produced].sort()).toEqual(declared);
    });
  });

  it("the host's request key reaches the Worker: one tool call id claims once and answers the same again, with the key the host made", async () => {
    const { options } = await actionOf("handle.claim", "dee");
    const first = await ok("handle.claim", options, { name: "deename" }, { caller: "tool", toolCallId: "c-dee-1" });
    const before = loop.proxy.seen.length;
    const again = await ok("handle.claim", options, { name: "deename" }, { caller: "tool", toolCallId: "c-dee-1" });
    expect(again, "the same tool call id answers the first answer").toEqual(first);
    expect(await eventsSince(before), "and claims nothing again").toEqual([]);
    expect(loop.proxy.seen.slice(before).map((s) => s.key), "with the key the host made").toEqual(["tool:c-dee-1"]);
  });

  it("a defect is a plain error with nothing of it on it, for every operation: a Worker that answers 500 leaks no credential, address, path or name", async () => {
    const broken = await proxy(loop.url, () => "answer-500");
    extra.push(broken);
    const samples: Record<string, Record<string, unknown>> = {
      "handle.claim": { name: "defectname" }, "handle.release": { handle: "hdl_abc" }, "handle.resolve": { name: "defectname" }, "link.add": { title: "Defect", url: "https://example.com/d" },
      "link.order": { link: "lnk_abc", position: 0n }, "link.remove": { link: "lnk_abc" }, "profile.get": { handle: "defectname" },
    };
    expect(Object.keys(samples).sort()).toEqual(Object.keys(model.operations).sort());
    for (const [op, args] of Object.entries(samples)) {
      const { options } = await actionOf(op, "ada", broken.url);
      const before = broken.seen.length;
      const error = await rejection(options.run(args, { caller: "tool", toolCallId: `defect-${op}` }));
      const operation = model.operations[op]!;
      expectRedacted(error, [people["ada"]!, broken.url, new URL(broken.url).host, "planted", `/${operation.thing}/${/\/verbs\/([^/]+)\.ts$/.exec(operation.file)![1]}`, "defectname", "hdl_abc", "lnk_abc"]);
      expect(broken.seen.length - before, `${op} reached the broken Worker once`).toBe(1);
    }
    expect(await resolvedTo("defectname")).toBe(NOT_FOUND);
  });

  it("an aborted signal ends every operation's call before the Worker is called, as a plain redacted error, and nothing is written", async () => {
    const cases: Record<string, Record<string, unknown>> = {
      "handle.claim": { name: "evename" }, "handle.release": { handle: "hdl_abc" }, "handle.resolve": { name: "evename" }, "link.add": { title: "Abort", url: "https://example.com/a" },
      "link.order": { link: "lnk_abc", position: 0n }, "link.remove": { link: "lnk_abc" }, "profile.get": { handle: "evename" },
    };
    expect(Object.keys(cases).sort()).toEqual(Object.keys(model.operations).sort());
    for (const [op, args] of Object.entries(cases)) {
      const { options } = await actionOf(op, "eve");
      const before = loop.proxy.seen.length;
      const error = await rejection(options.run(args, { caller: "tool", toolCallId: `abort-${op}`, signal: AbortSignal.abort() }));
      expectRedacted(error, [people["eve"]!, loop.url, "evename", "hdl_abc", "lnk_abc"]);
      expect(loop.proxy.seen.length, `${op}: no request left`).toBe(before);
    }
    expect(await resolvedTo("evename")).toBe(NOT_FOUND);
  });

  it("the reads answer what the SDK answers, whoever the caller is: handle.resolve and profile.get as a visitor under every caller, both readOnly; and a read is not remembered across a release", async () => {
    const id = await claimedBy("readname", "fay");
    const resolve = await actionOf("handle.resolve", undefined);
    const page = await actionOf("profile.get", undefined);
    expect([resolve.options.readOnly, page.options.readOnly]).toEqual([true, true]);
    const callers = ["tool", "http", "frontend", "mcp", "cli", "mcp-widget", "webmcp", "a2a"];
    const direct1 = await directOk("profile.get", undefined, { handle: "readname" });
    for (const [index, caller] of callers.entries()) {
      const ctx: ActionContext = { caller, ...(index % 2 === 0 ? {} : { userEmail: "fay@example.com", approvedToolCallKey: `k-${index}` }), ...(index % 3 === 0 ? { toolCallId: `read-${index}` } : {}) };
      expect(await ok("handle.resolve", resolve.options, { name: "readname" }, ctx), `resolve as ${caller}`).toEqual({ handle: id });
      expect(await ok("profile.get", page.options, { handle: "readname" }, ctx), `profile.get as ${caller}`).toEqual(direct1);
    }
    await directOk("handle.release", "fay", { handle: id });
    await expectRefusal(await rejection(resolve.options.run({ name: "readname" }, { caller: "tool" })), "HN-003", {});
    await expectRefusal(await rejection(page.options.run({ handle: "readname" }, { caller: "tool" })), "PR-001", {});
  });

  it("a page is built, ordered and cut through the actions: link.add twice, link.order, link.remove, each as the owner, each answering the model's shape, and profile.get shows each step", async () => {
    await claimedBy("pagename", "own4");
    const add = (await actionOf("link.add", "own4")).options;
    const order = (await actionOf("link.order", "own4")).options;
    const remove = (await actionOf("link.remove", "own4")).options;
    const page = (await actionOf("profile.get", undefined)).options;
    const titles = async () => {
      const got = (await ok("profile.get", page, { handle: "pagename" }, { caller: "http" })) as { links?: ReadonlyArray<{ title?: string }> };
      return (got.links ?? []).map((l) => l.title);
    };
    const a = (await ok("link.add", add, { title: "First", url: "https://example.com/1" }, { caller: "tool", toolCallId: "l-1" })) as { link: string };
    const b = (await ok("link.add", add, { title: "Second", url: "https://example.com/2" }, { caller: "tool", toolCallId: "l-2" })) as { link: string };
    expect(await titles()).toEqual(["First", "Second"]);
    await ok("link.order", order, { link: b.link, position: 0n }, { caller: "tool", toolCallId: "l-3" });
    expect(await titles()).toEqual(["Second", "First"]);
    await ok("link.remove", remove, { link: a.link }, { caller: "tool", toolCallId: "l-4" });
    expect(await titles()).toEqual(["Second"]);
  });

  describe("needsApproval, carried through from the model, with the defineAction wrapper", () => {
    it("handle.release asks a person once, before the Worker is called; a no is AR-007 (ApprovalDeclined) and nothing is written; a yes releases", async () => {
      const { defineAction } = await loadActions();
      const id = await claimedBy("releaseme", "own5");
      const { options } = await actionOf("handle.release", "own5");
      expect(options.needsApproval, "the model says so").toBe(model.operations["handle.release"]!.needsApproval === true);
      expect(options.needsApproval).toBe(true);
      const asked: Array<{ action: string; args: unknown; held: number }> = [];
      const person = (answer: boolean) => ({ ask: async (request: { action: string; args: unknown }) => { asked.push({ action: request.action, args: request.args, held: loop.proxy.seen.length }); return answer; } });
      const before = loop.proxy.seen.length;
      const declined = await rejection(defineAction(options, person(false)).run({ handle: id }, { caller: "tool", toolCallId: "r-1" }));
      await expectRefusal(declined, "AR-007", {});
      expect(asked).toEqual([{ action: "handle.release", args: { handle: id }, held: before }]);
      expect(loop.proxy.seen.length, "a no called nothing").toBe(before);
      expect(await resolvedTo("releaseme")).toBe(id);
      const beforeYes = loop.proxy.seen.length;
      const approved = await defineAction(options, person(true)).run({ handle: id }, { caller: "tool", toolCallId: "r-2" });
      expect(answerProblems("handle.release", approved)).toEqual([]);
      expect(asked.map((a) => a.action), "asked once more, once").toEqual(["handle.release", "handle.release"]);
      expect(asked[1]!.held, "before the Worker was called").toBe(beforeYes);
      expect(await eventsSince(beforeYes)).toEqual(["HandleReleased"]);
      expect(await resolvedTo("releaseme")).toBe(NOT_FOUND);
    });

    it("no other operation of the example asks: each action the model does not mark runs through the wrapper without a question", async () => {
      const { defineAction } = await loadActions();
      const asked: Array<unknown> = [];
      const person = { ask: async (request: unknown) => (asked.push(request), true) };
      const own = "own6";
      const wrapped = async (op: string, who: string | undefined) => defineAction((await actionOf(op, who)).options, person);
      const claim = await wrapped("handle.claim", own);
      const add = await wrapped("link.add", own);
      const order = await wrapped("link.order", own);
      const remove = await wrapped("link.remove", own);
      const resolve = await wrapped("handle.resolve", undefined);
      const get = await wrapped("profile.get", undefined);
      await claim.run({ name: "asknobody" }, { caller: "tool", toolCallId: "w-1" });
      const link = ((await add.run({ title: "Q", url: "https://example.com/q" }, { caller: "tool", toolCallId: "w-2" })) as { link: string }).link;
      await order.run({ link, position: 0n }, { caller: "tool", toolCallId: "w-3" });
      await resolve.run({ name: "asknobody" }, { caller: "tool" });
      await get.run({ handle: "asknobody" }, { caller: "tool" });
      await remove.run({ link }, { caller: "tool", toolCallId: "w-4" });
      expect(asked, "nothing was asked of anyone").toEqual([]);
      expect(Object.values(model.operations).filter((op) => op.needsApproval === true).map((op) => op.name)).toEqual(["handle.release"]);
    });
  });
});
