// `proposes` (GOAL17-slice9-build, call 9): an agent acting as itself that calls such an operation records a proposal and changes nothing; anyone else runs the handler.
import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint, Schema } from "orthograph";
import { EventNames } from "orthograph/server";
import { storeMemory } from "#modules/records/service.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "./service.ts";

const Agency = Blueprint.thing({ description: "An agency.", fields: { id: Blueprint.id("agy"), main: Blueprint.id("agt"), slots: Blueprint.uint(8) } });
const Proposal = Blueprint.thing({ description: "A proposal.", fields: { id: Blueprint.id("prp"), agency: Agency.fields.id, operation: Blueprint.text({ max: 80 }), changes: Blueprint.value(Schema.Unknown), why: Blueprint.text({ max: 200 }) } });
const Recorded = Blueprint.event({ proposal: Proposal.fields.id, agency: Proposal.fields.agency });
const Resized = Blueprint.event({ agency: Agency.fields.id });
EventNames.name(Recorded, "Recorded");
EventNames.name(Resized, "Resized");
const proposals = Blueprint.machine(Proposal, { states: ["waiting"], moves: { propose: { from: [], to: "waiting", emits: Recorded } }, notFrom: { exit: 50 } });
const agencies = Blueprint.machine(Agency, { states: ["live"], moves: { resize: { from: ["live"], to: "live", emits: Resized } }, notFrom: { exit: 51 } });
const resize = Blueprint.operation(Agency, {
  description: "Resize.", payload: { agency: Agency.fields.id, slots: Agency.fields.slots, why: Blueprint.optional(Blueprint.text({ max: 200 })) }, answer: { slots: Agency.fields.slots },
  move: agencies.moves.resize, allowed: [Blueprint.signedIn],
  proposes: { move: proposals.moves.propose, of: { thing: Agency, field: Agency.fields.main }, into: "agency", answer: { slots: 0n } },
});
const serve = () => Handlers.serve({
  name: "agency.resize", operation: resize,
  handler: (payload, { move }) => Effect.as(move(), { slots: payload.slots }),
});
const stock = () => storeMemory([[Agency, { id: "agy_1", main: "agt_main", slots: 1, state: "live" }]]);
const call = (memory: ReturnType<typeof stock>, principal: object, payload: object = { agency: "agy_1", slots: "9" }) =>
  Effect.runPromiseExit(serve().call(payload, principal as never).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));

describe("an operation that proposes", () => {
  it("records a proposal for the agent's own agency, answers as if nothing changed, and runs no handler", async () => {
    const memory = stock();
    const exit = await call(memory, { kind: "agent", agent: "agt_main", via: "agent" }, { agency: "agy_1", slots: "9", why: "busy week" });
    expect(Exit.isSuccess(exit) ? exit.value : exit).toEqual({ slots: 0n });
    expect(memory.entries.map((e) => [e.event, e.fields["agency"]])).toEqual([["Recorded", "agy_1"]]);
    const row = memory.rows.find((r) => r.instance["operation"] !== undefined)!.instance;
    expect(row).toMatchObject({ agency: "agy_1", operation: "agency.resize", why: "busy week" });
    expect(memory.rows.find((r) => r.instance["id"] === "agy_1")?.instance["slots"]).toBe(1);
  });

  it("says why it has no reason when none was given, and refuses an agent that is no agency's own", async () => {
    const memory = stock();
    await call(memory, { kind: "agent", agent: "agt_main", via: "agent" });
    expect(memory.rows.find((r) => r.instance["operation"] !== undefined)?.instance["why"]).toBe("no reason given");
    const stranger = await call(stock(), { kind: "agent", agent: "agt_other", via: "agent" });
    expect(Exit.isFailure(stranger) && String(Cause.squash(stranger.cause))).toContain("NotAllowed");
  });

  it("runs the handler for a person, who applies the change", async () => {
    const memory = stock();
    const exit = await call(memory, { kind: "person", person: "per_ada", via: "session" });
    expect(Exit.isSuccess(exit) ? exit.value : exit).toEqual({ slots: 9n });
    expect(memory.entries.map((e) => e.event)).toEqual(["Resized"]);
  });
});
