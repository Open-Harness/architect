// Goal 17 slice 5: a read with `only` or `derive` is declared and in the model, but served from slice 7. Until then it fails
// closed by name: never as a plain read that drops its pin, and never as a defect from its answer's check.
import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Reads } from "#modules/handler/service.js";
import { storeMemory } from "./service.ts";

const Proposal = Blueprint.thing({ description: "A proposal.", fields: { id: Blueprint.id("prp"), state: Blueprint.text() } });
const who = { kind: "person", person: "per_olga", via: "session" } as const;
const stocked = () => storeMemory([[Proposal, { id: "prp_1", state: "waiting" }]]);
const refused = async (served: ReturnType<typeof Reads.serve>, payload: Record<string, unknown>) => {
  const exit = await Effect.runPromiseExit(served.run(payload, who).pipe(Effect.provide(stocked().layer)));
  return Exit.isFailure(exit) && Cause.squash(exit.cause);
};

describe("a pinned or derived read, before slice 7", () => {
  it("a list read with `only` refuses ReadNotServed, and a plain one is still served", async () => {
    const pinned = Reads.serve({ name: "proposal.waiting", read: Blueprint.read(Proposal, { where: ["state"], only: { state: "waiting" }, order: "oldest", page: 25, allowed: [Blueprint.signedIn] }) });
    expect(await refused(pinned, {})).toMatchObject({ _tag: "ReadNotServed", read: "proposal.waiting" });
    const plain = Reads.serve({ name: "proposal.list", read: Blueprint.read(Proposal, { where: ["state"], order: "oldest", page: 25, allowed: [Blueprint.signedIn] }) });
    expect(await refused(plain, {})).toBe(false);
  });

  it("a read by id with a derive refuses ReadNotServed", async () => {
    const derive = Blueprint.derive(Proposal, { looks: {}, adds: { verdict: Blueprint.text() }, is: () => ({ verdict: "fine" }) });
    const derived = Reads.serve({ name: "proposal.stage", read: Blueprint.read(Proposal, { by: "id", fields: ["state"], derive, allowed: [Blueprint.signedIn] }) });
    expect(await refused(derived, { id: "prp_1" })).toMatchObject({ _tag: "ReadNotServed" });
  });

  it("who may call is still decided first: a stranger is refused NotAllowed, not told the read is unserved", async () => {
    const pinned = Reads.serve({ name: "proposal.waiting", read: Blueprint.read(Proposal, { where: ["state"], only: { state: "waiting" }, order: "oldest", page: 25, allowed: [Blueprint.system] }) });
    expect(await refused(pinned, {})).toMatchObject({ _tag: "NotAllowed" });
  });
});
