// Goal 17 slice 7: a read with `only` or `derive` is served. `only` is the read's own filter, never the caller's; a derive looks
// at the records that name the root, then works its answer out; a derive that looks at something no store can list still fails
// closed by name, never as a plain read that drops its adds.
import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Reads } from "#modules/handler/service.js";
import { storeMemory } from "./service.ts";

const Proposal = Blueprint.thing({ description: "A proposal.", fields: { id: Blueprint.id("prp"), state: Blueprint.text() } });
const Note = Blueprint.thing({ description: "A note on a proposal.", fields: { id: Blueprint.id("not"), proposal: Proposal.fields.id, from: Blueprint.text(), seq: Blueprint.uint(32) } });
const who = { kind: "person", person: "per_olga", via: "session" } as const;
const stocked = () => storeMemory([
  [Proposal, { id: "prp_1", state: "waiting" }], [Proposal, { id: "prp_2", state: "decided" }], [Proposal, { id: "prp_3", state: "waiting" }],
  [Note, { id: "not_1", proposal: "prp_1", from: "person", seq: 1n }], [Note, { id: "not_2", proposal: "prp_1", from: "agent", seq: 2n }], [Note, { id: "not_3", proposal: "prp_3", from: "agent", seq: 1n }],
]);
const run = (served: ReturnType<typeof Reads.serve>, payload: Record<string, unknown>) => Effect.runPromiseExit(served.run(payload, who).pipe(Effect.provide(stocked().layer)));
const refused = async (served: ReturnType<typeof Reads.serve>, payload: Record<string, unknown>) => {
  const exit = await run(served, payload);
  return Exit.isFailure(exit) && Cause.squash(exit.cause);
};
const answered = async (served: ReturnType<typeof Reads.serve>, payload: Record<string, unknown>) => {
  const exit = await run(served, payload);
  if (Exit.isFailure(exit)) throw new Error(`refused: ${String(Cause.squash(exit.cause))}`);
  return exit.value as { items: Array<Record<string, unknown>>; next: string | null } & Record<string, unknown>;
};

const Mood = Blueprint.derive(Proposal, {
  looks: { last: Blueprint.newest(Note, { by: Note.fields.proposal }), person: Blueprint.newest(Note, { by: Note.fields.proposal, where: { from: "person" } }), all: Blueprint.all(Note, { by: Note.fields.proposal, max: 5 }) },
  adds: { mood: Blueprint.oneOf(["quiet", "heard", "spoken"]), count: Blueprint.uint(32) },
  is: (_root, found) => ({
    mood: found.last === undefined ? "quiet" : found.person !== undefined ? "spoken" : "heard",
    count: BigInt(found.all.length),
  }),
});

describe("a pinned read", () => {
  it("a list read with `only` lists what the pin names, whatever the caller sends", async () => {
    const pinned = Reads.serve({ name: "proposal.waiting", read: Blueprint.read(Proposal, { where: ["state"], only: { state: "waiting" }, order: "oldest", page: 25, allowed: [Blueprint.signedIn] }) });
    expect((await answered(pinned, {})).items.map((i) => i["id"])).toEqual(["prp_1", "prp_3"]);
    expect((await answered(pinned, { state: "decided" })).items.map((i) => i["id"])).toEqual(["prp_1", "prp_3"]);
  });

  it("a plain list read is as it was", async () => {
    const plain = Reads.serve({ name: "proposal.list", read: Blueprint.read(Proposal, { where: ["state"], order: "oldest", page: 25, allowed: [Blueprint.signedIn] }) });
    expect((await answered(plain, {})).items).toHaveLength(3);
  });

  it("who may call is still decided first: a stranger is refused NotAllowed", async () => {
    const pinned = Reads.serve({ name: "proposal.waiting", read: Blueprint.read(Proposal, { where: ["state"], only: { state: "waiting" }, order: "oldest", page: 25, allowed: [Blueprint.system] }) });
    expect(await refused(pinned, {})).toMatchObject({ _tag: "NotAllowed" });
  });
});

describe("a derived read", () => {
  const byId = Reads.serve({ name: "proposal.mood", read: Blueprint.read(Proposal, { by: "id", fields: ["state"], derive: Mood, allowed: [Blueprint.signedIn] }) });

  it("by id answers the fields it names and what its looks worked out", async () => {
    expect(await answered(byId, { id: "prp_1" })).toEqual({ state: "waiting", mood: "spoken", count: 2n });
    expect(await answered(byId, { id: "prp_3" })).toEqual({ state: "waiting", mood: "heard", count: 1n });
    expect(await answered(byId, { id: "prp_2" })).toEqual({ state: "decided", mood: "quiet", count: 0n });
  });

  it("an id that is not there is refused NotAllowed, as a plain read refuses it", async () => {
    expect(await refused(byId, { id: "prp_9" })).toMatchObject({ _tag: "NotAllowed" });
  });

  it("a list works each root out, keeps those that hold what `only` pins, and gives a cursor that continues", async () => {
    const heard = Reads.serve({ name: "proposal.heard", read: Blueprint.read(Proposal, { where: ["mood"], only: { mood: "heard" }, derive: Mood, order: "oldest", page: 1, allowed: [Blueprint.signedIn] }) });
    const first = await answered(heard, {});
    expect(first.items.map((i) => [i["id"], i["mood"], i["state"]])).toEqual([["prp_3", "heard", "waiting"]]);
    expect(first.next).toBeNull();
    const all = Reads.serve({ name: "proposal.moods", read: Blueprint.read(Proposal, { where: ["mood", "state"], derive: Mood, order: "oldest", page: 2, allowed: [Blueprint.signedIn] }) });
    const page = await answered(all, {});
    expect(page.items.map((i) => i["mood"])).toEqual(["spoken", "quiet"]);
    expect(page.next).not.toBeNull();
    const rest = await answered(all, { cursor: page.next });
    expect(rest.items.map((i) => i["mood"])).toEqual(["heard"]);
    expect(rest.next).toBeNull();
  });

  it("a filter on a derived field, and one on a stored field, both narrow it", async () => {
    const all = Reads.serve({ name: "proposal.moods", read: Blueprint.read(Proposal, { where: ["mood", "state"], derive: Mood, order: "oldest", page: 10, allowed: [Blueprint.signedIn] }) });
    expect((await answered(all, { mood: "spoken" })).items.map((i) => i["id"])).toEqual(["prp_1"]);
    expect((await answered(all, { state: "waiting" })).items.map((i) => i["id"])).toEqual(["prp_1", "prp_3"]);
    expect((await answered(all, { state: "waiting", mood: "quiet" })).items).toEqual([]);
  });

  it("a derive that looks at the problems of the app is refused by name, never served as a plain read", async () => {
    const watched = Blueprint.derive(Proposal, { looks: { watched: Blueprint.problems() }, adds: { verdict: Blueprint.text() }, is: () => ({ verdict: "fine" }) });
    const served = Reads.serve({ name: "proposal.health", read: Blueprint.read(Proposal, { by: "id", fields: ["state"], derive: watched, allowed: [Blueprint.signedIn] }) });
    expect(await refused(served, { id: "prp_1" })).toMatchObject({ _tag: "ReadNotServed", read: "proposal.health" });
  });
});
