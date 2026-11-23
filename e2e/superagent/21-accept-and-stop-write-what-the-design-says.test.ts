// Check 21 (slice 6): what `ticket.accept` and `ticket.stop` declare they write, read from the model (`ortho model --json` on a copy of
// the app). A handler may only write what its operation declares in a database step (`Blueprint.step.database({ writes })`), so
// "an accept making its records in one commit" and "a stop withdrawing the mandate and closing the assignment in one commit" are
// first a matter of what the one step names. The journeys that run them (a listed account calls `ticket.accept`; a ticket is
// stopped after a handoff) are `22-stage-one-doors`.
//
//  - `ticket.accept` (GOAL17-stage-one, call 3): its Ticket, Mandate, Subscription, Assignment and Input in one commit. Its executor
//    is an Agent, which lives in its own actor store, so it is opened first by `agent.open` and the accept takes its id (the model says
//    `agent` is a reference that must already exist, `AgentNotFound`); no one commit holds it.
//  - `ticket.stop` ("Where it stands" and the Ticket row): "stop withdraws the mandate", and "closes the executor's current
//    Assignment" (`cancelled` when it is pending, `interrupted` when it is running, from the state it reads). Both are records of
//    the stop's own commit, beside the Ticket's move to `stopped`.
//
// CONTROLS: the reading is shown to refuse a step that names fewer things, more steps than one, two steps splitting the writes,
// a step that is not a database step, and no step at all.
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { build, removeCopies, type Built, type Node } from "./app.ts";

/** What is wrong with an operation's steps as the commit of these records: it declares them in one database step, each once. */
export const commitProblems = (steps: Node | undefined, needs: ReadonlyArray<string>): ReadonlyArray<string> => {
  const found = Object.entries(steps ?? {});
  if (found.length === 0) return ["declares no step, so it may write nothing"];
  const database = found.filter(([, s]) => (s as Node)["type"] === "database");
  const holders = database.filter(([, s]) => needs.every((n) => ((s as Node)["writes"] as ReadonlyArray<string>).includes(n)));
  const out: Array<string> = [];
  if (holders.length === 0) {
    const named = new Set(database.flatMap(([, s]) => (s as Node)["writes"] as ReadonlyArray<string>));
    const missing = needs.filter((n) => !named.has(n));
    out.push(missing.length > 0 ? `no database step writes ${missing.join(", ")}` : `${needs.join(", ")} are written by more than one step, so not in one commit`);
  }
  if (holders.length > 1) out.push(`${holders.length} steps each write all of ${needs.join(", ")}`);
  if (database.length > 1) out.push(`${database.length} database steps: the writes are not one commit`);
  for (const [, s] of holders) {
    const writes = (s as Node)["writes"] as ReadonlyArray<string>;
    const repeated = writes.filter((w, i) => writes.indexOf(w) !== i);
    if (repeated.length > 0) out.push(`a step names ${repeated.join(", ")} twice`);
  }
  return out;
};

const ACCEPT = ["ticket", "mandate", "subscription", "assignment", "input"] as const;
const STOP = ["ticket", "mandate", "assignment"] as const;

describe("21 accept and stop: controls", () => {
  const step = (writes: ReadonlyArray<string>) => ({ name: "x", type: "database", writes });
  it("accepts one database step that names every record", () => {
    expect(commitProblems({ write: step([...ACCEPT]) }, ACCEPT)).toEqual([]);
    expect(commitProblems({ write: step([...STOP, "outgoing-message"]) }, STOP)).toEqual([]);
  });
  it("refuses no step, a step that names too few, and each record missing in turn", () => {
    expect(commitProblems({}, ACCEPT)).not.toEqual([]);
    expect(commitProblems(undefined, STOP)).not.toEqual([]);
    for (const left of ACCEPT) expect(commitProblems({ write: step(ACCEPT.filter((a) => a !== left)) }, ACCEPT), `without ${left}`).toEqual([`no database step writes ${left}`]);
    for (const left of STOP) expect(commitProblems({ write: step(STOP.filter((a) => a !== left)) }, STOP), `without ${left}`).toEqual([`no database step writes ${left}`]);
  });
  it("refuses the records split across two steps, and a step that is not a database step", () => {
    expect(commitProblems({ a: step(["ticket", "mandate"]), b: step(["subscription", "assignment", "input"]) }, ACCEPT)[0]).toMatch(/more than one step/);
    expect(commitProblems({ write: { name: "x", type: "call", writes: [...ACCEPT] } }, ACCEPT)).not.toEqual([]);
  });
  it("refuses a second database step beside the one that holds the records", () => {
    expect(commitProblems({ write: step([...ACCEPT]), extra: step(["ticket"]) }, ACCEPT)).toEqual(["2 database steps: the writes are not one commit"]);
  });
  it("refuses the same records written by two steps, and a record named twice", () => {
    expect(commitProblems({ a: step([...ACCEPT]), b: step([...ACCEPT]) }, ACCEPT)[0]).toMatch(/2 steps/);
    expect(commitProblems({ a: step([...ACCEPT, "ticket"]) }, ACCEPT)).toEqual(["a step names ticket twice"]);
  });
});

describe("21 accept and stop: what the app declares", () => {
  let built: Built;
  beforeAll(() => { built = build(); }, 600_000);
  afterAll(removeCopies);

  it("`ticket.accept` writes its ticket, mandate, subscription, assignment and input in one database step", () => {
    expect(commitProblems((built.model["operations"]["ticket.accept"] as Node)["steps"], ACCEPT)).toEqual([]);
  });

  it("`ticket.stop` writes its ticket, the mandate it withdraws and the assignment it closes in one database step", () => {
    expect(commitProblems((built.model["operations"]["ticket.stop"] as Node)["steps"], STOP)).toEqual([]);
  });
});
