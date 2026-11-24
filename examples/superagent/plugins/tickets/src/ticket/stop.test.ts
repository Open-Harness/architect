// `ticket.stop` through `Handlers.serve`, as the server runs it: the ticket stops, its mandate is withdrawn, and its executor's current Assignment is
// closed from the state the call reads, all in one commit. A journey that stops a ticket and reads the mandate and the assignment back is `22`'s
// ("a stop withdraws the mandate", "a stop cancels or closes from the state it reads"), which waits on the harness's doors; check 19 has no ticket
// and reads none of these rows, so nothing there could notice a stop that left them as they were.
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { BusyLive, Handlers, Store, storeMemory, type Instance } from "@orthograph/language-effect";
import declaration from "../../blueprint/things/ticket/verbs/stop.ts";
import { Assignment } from "../../blueprint/things/assignment/thing.ts";
import { Mandate } from "../../blueprint/things/mandate/thing.ts";
import { Ticket } from "../../blueprint/things/ticket/thing.ts";
import stop from "./stop.ts";

const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const ticket: Instance = { id: "tkt_1", superagent: "sag_1", title: "t", agent: "agt_1", seq: 1n, state: "open" };
const mandate = (state: string): Instance => ({ id: "mnd_1", superagent: "sag_1", ticket: "tkt_1", account: "acc_1", policy: 1n, state });
const assignment = (state: string): Instance => ({ id: "asg_1", superagent: "sag_1", ticket: "tkt_1", agent: "agt_1", input: "inp_1", why: "launch", seat: 0n, state });

/** Stop ticket tkt_1 over a store that holds it, its mandate and its assignment, and read the three back. */
const stopped = async (assignmentState: string) => {
  const store = storeMemory([[Ticket, ticket], [Mandate, mandate("held")], [Assignment, assignment(assignmentState)]]);
  const served = Handlers.serve({ name: "ticket.stop", operation: declaration, handler: stop as never, notFrom: "TicketNotOpen" });
  const layer = Layer.mergeAll(BusyLive, store.layer);
  await Effect.runPromise((served.run({ superagent: "sag_1", ticket: "tkt_1" } as never, ada) as Effect.Effect<unknown, unknown, never>).pipe(Effect.provide(Layer.mergeAll(layer))));
  const read = (thing: typeof Ticket | typeof Mandate | typeof Assignment, id: string) => Effect.runPromise(Effect.flatMap(Store, (s) => s.find(thing, id)).pipe(Effect.provide(layer)));
  return { ticket: (await read(Ticket, "tkt_1"))?.instance.state, mandate: (await read(Mandate, "mnd_1"))?.instance.state, assignment: (await read(Assignment, "asg_1"))?.instance.state };
};

describe("ticket.stop, served", () => {
  it("withdraws the mandate and ends an assignment nothing ran on", async () => {
    expect(await stopped("pending")).toEqual({ ticket: "stopped", mandate: "withdrawn", assignment: "ended" });
  });

  it("withdraws the mandate and closes a running assignment, which keeps its seat until the agent says it closed", async () => {
    expect(await stopped("running")).toEqual({ ticket: "stopped", mandate: "withdrawn", assignment: "closing" });
  });

  it("leaves an assignment that is already closing or ended as it was", async () => {
    expect((await stopped("closing")).assignment).toBe("closing");
    expect((await stopped("ended")).assignment).toBe("ended");
  });
});
