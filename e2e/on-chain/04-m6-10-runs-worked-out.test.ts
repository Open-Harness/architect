// Goal 4, slice 3 (M6.10), fourth check: `runs` is worked out, never written (`design/decisions/K25-the-blueprint-on-chain.md` item 6; `M6-chain.md` item 8).
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. In a project with a chain store and a database store side by side, written without a single `runs`, with the real `ortho model --json`:
//   - every operation of a thing that lives in the chain store (`allowance.grant`, `.spend`, `.revoke`) is `runs: "chain"` in the model;
//   - every operation of a thing that lives in the database (`ticket.open`, `ticket.close`) stays `runs: "server"`;
//   - the blueprint's files hold no `runs` (so the model's word is the compiler's, not copied from the author);
//   - an author who writes `runs: "chain"` on an operation of a database thing is refused, naming the file and `runs` (true today, and it must stay so: a
//     thing that does not live on a chain does not run there); `runs: "server"` on an operation of a database thing compiles, as it does today.
// (The refusal of `runs` on a chain operation itself is in `04-m6-10-operations-refused.test.ts`.)
//
// THE CONTROLS: the readers here are plain comparisons of the model with the thing's own store, planted below: an operation that runs where its thing does not.
import { describe, expect, it } from "vitest";
import { CHAIN_BASE, DB_BASE, compiles, inFile, put, refuses, swap, type AnyModel, type Files } from "./chain-fixture.ts";

const MIXED: Files = { ...CHAIN_BASE, ...DB_BASE };

/** Where each operation of a model runs, against where its thing lives: one line per operation that is somewhere else than its thing's store says. */
const runsProblems = (model: AnyModel): ReadonlyArray<string> =>
  Object.entries(model.operations).filter(([, op]) => op["kind"] === "operation").flatMap(([name, op]) => {
    const store = model.things[String(op["thing"])]?.store;
    const onChain = store !== undefined && model.stores?.[store]?.kind === "chain.evm";
    const want = onChain ? "chain" : "server";
    return op.runs === want ? [] : [`${name}: runs ${JSON.stringify(op.runs)}, but its thing lives ${onChain ? "on chain" : "in no chain store"}, so ${want}`];
  });

describe("controls: runsProblems refuses an operation that runs where its thing does not live", () => {
  const model = (chainRuns: string, dbRuns: string) => ({
    stores: { budgets: { kind: "chain.evm" } },
    things: { allowance: { store: "budgets" }, ticket: {} },
    operations: { "allowance.spend": { kind: "operation", thing: "allowance", runs: chainRuns }, "ticket.open": { kind: "operation", thing: "ticket", runs: dbRuns } },
  } as unknown as AnyModel);
  it("accepts chain for the chain thing and server for the other", () => expect(runsProblems(model("chain", "server"))).toEqual([]));
  it("refuses server on a chain thing, chain on a database thing, and a missing or wider word", () => {
    expect(runsProblems(model("server", "server"))).toHaveLength(1);
    expect(runsProblems(model("chain", "chain"))).toHaveLength(1);
    expect(runsProblems(model(undefined as never, "server"))).toHaveLength(1);
    expect(runsProblems(model(["chain"] as never, "server"))).toHaveLength(1);
    expect(runsProblems(model("chain", null as never))).toHaveLength(1);
  });
});

describe("controls, true today: a database operation may say server and may not say chain", () => {
  const OPEN = "things/ticket/verbs/open.ts";
  it("runs: \"server\" on a database operation compiles", () => expect(compiles(swap(DB_BASE, OPEN, "  allowed: [Blueprint.anyone],\n", '  allowed: [Blueprint.anyone],\n  runs: "server",\n')).operations["ticket.open"]?.runs).toBe("server"));
  it("runs: \"chain\" on a database operation is refused, naming the file and runs", () => refuses(swap(DB_BASE, OPEN, "  allowed: [Blueprint.anyone],\n", '  allowed: [Blueprint.anyone],\n  runs: "chain",\n'), [inFile(`blueprint/${OPEN}`), /runs/i]));
});

describe("runs is worked out for an operation on a chain-stored thing", () => {
  it("the blueprint says no runs anywhere", () => { for (const [file, text] of Object.entries(MIXED)) expect(text, file).not.toMatch(/\bruns\b/); });
  it("grant, spend and revoke run on chain; open and close, of a database thing in the same project, run on the server", () => {
    const m = compiles(MIXED);
    expect(Object.fromEntries(Object.entries(m.operations).filter(([, op]) => op["kind"] === "operation").map(([n, op]) => [n, op.runs]))).toEqual({
      "allowance.grant": "chain", "allowance.spend": "chain", "allowance.revoke": "chain", "ticket.open": "server", "ticket.close": "server",
    });
    expect(runsProblems(m)).toEqual([]);
  });
});
