// Check 11 (Goal 17 slice 5): @orthograph/tickets is in examples/superagent's model and generated docs, CLI and MCP:
// Mandate, Ticket, Subscription, Assignment, Input, Report, Attention and Outgoing message, with their states, moves,
// operations, events and errors.
import { afterAll, describe, expect, it } from "vitest";
import { allowedSet, build, entries, lazy, removeCopies } from "./app.ts";
import { tickets } from "./blueprint-names.ts";
import { describePlugin } from "./names-check.ts";

describePlugin("11", tickets);

describe("11 @orthograph/tickets: what only this plugin's design says", () => {
  const built = lazy(build);
  afterAll(removeCopies);
  const rules = (thing: string) => Object.values<any>(built().model["things"][thing]?.invariants ?? {});
  const same = (a: ReadonlyArray<string> | undefined, w: ReadonlyArray<string>) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...w].sort());

  it("an Assignment has the two unique rules that make a seat count honest (GOAL17-executor-slots)", () => {
    expect(rules("assignment").some((r) => same(r.fields, ["superagent", "seat"]) && same(r.while, ["running", "closing"]) && r.refuse === "SeatTaken"), "one holder per seat, while running or closing, refusing SeatTaken").toBe(true);
    expect(rules("assignment").some((r) => same(r.fields, ["agent"]) && same(r.while, ["pending", "running", "closing"]) && r.refuse === "ExecutorAlreadyQueued"), "one live Assignment per executor, refusing ExecutorAlreadyQueued").toBe(true);
  });

  it("a ticket follows a thread once: a Subscription is unique by (ticket, thread) while live (GOAL17-executor-slots, 'Two writers, one guard')", () => {
    expect(rules("subscription").some((r) => same(r.fields, ["ticket", "thread"]) && (r.while ?? []).length > 0)).toBe(true);
  });

  it("a Ticket's, an Input's and a Report's `seq` are uint(64), so a busy ticket never wraps it (GOAL17-derived-reads: the order two tables share)", () => {
    for (const t of ["ticket", "input", "report"]) expect(built().model["things"][t]?.fields?.["seq"]?.value, `${t}.seq`).toMatchObject({ type: "uint", bits: 64 });
  });

  it("`ticket.accept` takes the superagent and the account it is asked under, and is admitted by the listed-account role (GOAL17-source-from)", () => {
    const accept = built().model["operations"]["ticket.accept"];
    expect(Object.keys(accept?.payload ?? {})).toEqual(expect.arrayContaining(["superagent", "account"]));
    expect(allowedSet(accept?.allowed), "allowed: [listed.of(\"account\")], and nothing wider").toEqual(entries({ kind: "role-of", role: "account.listed", path: "account" }));
  });

  it("the executor's own operations are admitted by the ticket's agent role, `itsAgent` (K40 fix 3, the `agent:` form)", () => {
    expect(built().model["things"]["ticket"]?.roles).toContain("itsAgent");
    for (const o of ["ticket.report", "ticket.ack"]) expect(allowedSet(built().model["operations"][o]?.allowed), `${o}: allowed: [itsAgent], and nothing wider`).toEqual(entries({ kind: "role", role: "ticket.itsAgent" }));
  });
});
