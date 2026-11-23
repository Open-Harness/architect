// Goal 4, slice 3 (M6.10), eighth check: `ortho check` calls a change major or minor (`design/milestones.md` M6.10's row; `design/decisions/M6-chain.md` items 2 and 4).
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. `ortho check` compares the blueprint with the model checked in at `generated/model/model.json` (what the last generate wrote) and says, in a line
// naming what changed, how much the change means for the version. Each case below checks the project in (`ortho generate`, or for a chain project the model written
// as `ortho model --json` writes it), changes the blueprint, does not generate again, and runs `ortho check`:
//   - a thing moved from the database to a chain store is major: a line holds the thing and `major`;
//   - reordering a chain-stored thing's states, or putting a new one before the last, is major: a line holds the thing and `major` (the states' numbers are what rows
//     mean on chain, item 2); adding one at the end is minor: a line holds the thing and `minor`, and no line says `major`;
//   - renaming a declared error, and renaming the thing's first state (its machine refusal), are major: a line holds the error's name or code and `major`;
//   - no change is no line of `major` or `minor`, and `ortho check` passes; a new declared error, and reordering the tail of a database thing's states, say no `major`; removing a chain state is major.
// Where the baseline is read from is the checks author's reading ("Questions for the lead"): the model checked in under `generated/`, as `ortho check`'s drift part
// already reads that folder. The report may be one line or several, in `ortho check`'s output; its place in the output and its other words are the builder's.
//
// THE CONTROLS plant wrong output against `says`: a line with the bump but not the subject, one with the subject but another bump, `major` in a word, and no line.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHAIN_BASE, DB_BASE, projectOf, put, refusalLines, run, swap, word, type Files, type Project } from "./chain-fixture.ts";

/** Whether a line of `out` holds the subject (a pattern) and the bump, as a word. */
const says = (out: string, subject: RegExp, bump: "major" | "minor"): boolean => refusalLines(out, [subject, new RegExp(`\\b${bump}\\b`, "i")]).length > 0;
const anyBump = (out: string, bump: "major" | "minor"): ReadonlyArray<string> => out.split("\n").filter((l) => new RegExp(`\\b${bump}\\b`, "i").test(l));

describe("controls: says refuses a hollow report", () => {
  const subject = word("allowance");
  it("accepts a line with the subject and the bump", () => expect(says("  thing allowance: states reordered, major", subject, "major")).toBe(true));
  it("refuses the bump without the subject, the subject with another bump, the bump inside a word, and no line", () => {
    expect(says("  thing ticket: major", subject, "major")).toBe(false);
    expect(says("  thing allowance: minor", subject, "major")).toBe(false);
    expect(says("  thing allowance: majority", subject, "major")).toBe(false);
    expect(says("check ✘", subject, "major")).toBe(false);
  });
});

// A step-less ticket, so the same blueprint can move to a chain store (a contract has no database steps).
const NOSTEPS = (files: Files): Files => ["things/ticket/verbs/open.ts", "things/ticket/verbs/close.ts"].reduce((f, v) => swap(f, v, "  steps: { save: Blueprint.step.database() },\n", ""), files);
const TICKETS: Files = NOSTEPS(DB_BASE);
const WITH_STORE = (files: Files): Files =>
  swap(swap(put(files, "stores/ledger.ts", `import { Blueprint } from "orthograph";\nexport default Blueprint.store.chain.evm();\n`), "things/ticket/thing.ts", '  code: "TK",\n', '  code: "TK",\n  lives: ledger,\n'),
    "things/ticket/thing.ts", 'import { Cap } from "../../values/amounts.ts";\n', 'import { Cap } from "../../values/amounts.ts";\nimport ledger from "../../stores/ledger.ts";\n');

const write = (p: Project, files: Files, base: Files) => {
  for (const [f, t] of Object.entries(files)) if (t !== null && t !== base[f]) { mkdirSync(dirname(join(p.root, "blueprint", f)), { recursive: true }); writeFileSync(join(p.root, "blueprint", f), t); }
};
/** Check the base in (`generate` for a plain project, the model as `ortho model --json` for one that no language renders yet), change it, run `ortho check`. */
const after = (base: Files, change: (f: Files) => Files, how: "generate" | "model" = "generate") => {
  const p = projectOf(base);
  try {
    if (how === "generate") { const g = run(p.root, "generate"); expect(g.status, g.err + g.out.slice(-500)).toBe(0); }
    else { const m = run(p.root, "model", "--json"); expect(m.status, m.err).toBe(0); mkdirSync(join(p.root, "generated/model"), { recursive: true }); writeFileSync(join(p.root, "generated/model/model.json"), m.out); }
    write(p, change(base), base);
    const model = run(p.root, "model", "--json");
    expect(model.status, `the changed blueprint should still compile, so that check can compare it:\n${model.err.slice(0, 1500)}`).toBe(0);
    return run(p.root, "check");
  } finally { p.remove(); }
};

const states = (list: string) => (f: Files): Files => swap(f, "things/allowance/machine.ts", 'states: ["active", "exhausted", "revoked"],', `states: [${list}],`);

describe("controls, true today: no change reports no bump", () => {
  it("nothing changed: check passes and says neither major nor minor", () => {
    const c = after(DB_BASE, (f) => f);
    expect(c.status, c.out).toBe(0);
    expect(anyBump(c.out, "major")).toEqual([]);
    expect(anyBump(c.out, "minor")).toEqual([]);
  });
  it("a new declared error: no major", () => {
    const c = after(DB_BASE, (f) => put(f, "things/ticket/errors.ts", `${f["things/ticket/errors.ts"]}export class TicketLate extends Blueprint.error({}, { exit: 12 }) {}\n`));
    expect(anyBump(c.out, "major")).toEqual([]);
  });
  it("reordering the tail of a database thing's states: no major (the order means nothing off chain; the first state, whose name is in a refusal, stays)", () => {
    const three = put(DB_BASE, "things/ticket/machine.ts", DB_BASE["things/ticket/machine.ts"]!.replace('states: ["open", "closed"]', 'states: ["open", "closed", "archived"]'));
    const c = after(three, (f) => swap(f, "things/ticket/machine.ts", 'states: ["open", "closed", "archived"]', 'states: ["open", "archived", "closed"]'));
    expect(anyBump(c.out, "major")).toEqual([]);
  });
});

describe("ortho check reports a move to a chain store as major", () => {
  it("ticket moves from the database to a chain store", () => {
    const c = after(TICKETS, WITH_STORE);
    expect(says(c.out, word("ticket"), "major"), `no line holds ticket and major:\n${c.out}`).toBe(true);
  });
});

describe("ortho check reports the states' numbers on chain: reordered or inserted is major, appended is minor", () => {
  it("two states swapped", () => {
    const c = after(CHAIN_BASE, states('"exhausted", "active", "revoked"'), "model");
    expect(says(c.out, word("allowance"), "major"), `no line holds allowance and major:\n${c.out}`).toBe(true);
  });
  it("a new state before the last", () => {
    const c = after(CHAIN_BASE, states('"active", "paused", "exhausted", "revoked"'), "model");
    expect(says(c.out, word("allowance"), "major"), `no line holds allowance and major:\n${c.out}`).toBe(true);
  });
  it("a state removed (exhausted, with the moves that named it)", () => {
    const c = after(CHAIN_BASE, (f) => swap(swap(swap(f, "things/allowance/machine.ts", 'states: ["active", "exhausted", "revoked"],', 'states: ["active", "revoked"],'), "things/allowance/machine.ts", 'to: ["active", "exhausted"]', 'to: ["active"]'), "things/allowance/machine.ts", 'from: ["active", "exhausted"]', 'from: ["active"]'), "model");
    expect(says(c.out, word("allowance"), "major"), `no line holds allowance and major:\n${c.out}`).toBe(true);
  });
  it("a new state at the end", () => {
    const c = after(CHAIN_BASE, states('"active", "exhausted", "revoked", "expired"'), "model");
    expect(says(c.out, word("allowance"), "minor"), `no line holds allowance and minor:\n${c.out}`).toBe(true);
    expect(anyBump(c.out, "major"), "adding a state at the end is not major").toEqual([]);
  });
  it("nothing changed in a chain project: no bump", () => {
    const c = after(CHAIN_BASE, (f) => f, "model");
    expect(anyBump(c.out, "major")).toEqual([]);
    expect(anyBump(c.out, "minor")).toEqual([]);
  });
});

describe("ortho check reports a renamed refusal as major", () => {
  it("a declared error renamed (TicketBusy to TicketStuck)", () => {
    const c = after(DB_BASE, (f) => swap(swap(swap(f, "things/ticket/errors.ts", "class TicketBusy", "class TicketStuck"), "things/ticket/verbs/open.ts", "import { TicketTooBig, TicketBusy }", "import { TicketTooBig, TicketStuck }"), "things/ticket/verbs/open.ts", "errors: [TicketTooBig, TicketBusy]", "errors: [TicketTooBig, TicketStuck]"));
    expect(says(c.out, /TicketBusy|TK-002/, "major"), `no line holds TicketBusy or TK-002 and major:\n${c.out}`).toBe(true);
  });
  it("the first state renamed, which renames the machine's refusal (TicketNotOpen), keeping its code", () => {
    const c = after(DB_BASE, (f) => put(f, "things/ticket/machine.ts", f["things/ticket/machine.ts"]!.replace('states: ["open", "closed"]', 'states: ["fresh", "closed"]').replace('to: "open"', 'to: "fresh"').replace('from: ["open"]', 'from: ["fresh"]')));
    expect(says(c.out, /TicketNotOpen|TK-900/, "major"), `no line holds TicketNotOpen or TK-900 and major:\n${c.out}`).toBe(true);
  });
});
