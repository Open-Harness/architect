// Goal 4, slice 3 (M6.10), tenth check: the four refusals the chain adds to the runtime's two, AR-003 to AR-006, and the names they reserve
// (`design/decisions/M6-chain.md` item 4: "AR-003 SignatureExpired { deadline }, AR-004 InvalidNonce { expected, got }, AR-005 BadSignature, AR-006 AlreadyExists { id }"; "Adding
// them to RUNTIME_CODES reserves the four names project-wide, as NotAllowed is"). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks
// come first").
//
// WHAT IS REQUIRED. With the real `ortho model --json` and `ortho check`:
//   - in a project with a chain store, the model's `refusals` map holds SignatureExpired AR-003, InvalidNonce AR-004, BadSignature AR-005 and AlreadyExists AR-006, beside
//     NotAllowed AR-001 and IdempotencyConflict AR-002, and AllowanceExceeded AL-001;
//   - a declared error named any of the four is refused, in any project (the names are reserved project-wide, as NotAllowed and IdempotencyConflict are), naming the
//     errors file, the error and that the runtime has the name; a declared error named NotAllowed or IdempotencyConflict is refused the same way today (control, true today);
//   - in a project with no chain store, `refusals` holds only what it holds today (AR-001 and AR-002 beside the thing's own), because acme's and Plugged In's generated model.json
//     must stay byte for byte (check 02): the four codes are the chain's, in the lock and the model of a project that has a chain store.
// Whether the four are in the lock of a project with a chain store is judged in `05-m6-11-lock-chain-wire.test.ts`.
//
// THE CONTROLS: the planted wrong outputs are the model's own refusals map against the literal table below, and `refuses` (as in the values and operations checks).
import { describe, expect, it } from "vitest";
import { CHAIN_BASE, DB_BASE, compiles, inFile, put, refuses, word, type Files } from "./chain-fixture.ts";

const RUNTIME = { NotAllowed: "AR-001", IdempotencyConflict: "AR-002", SignatureExpired: "AR-003", InvalidNonce: "AR-004", BadSignature: "AR-005", AlreadyExists: "AR-006" } as const;
const withError = (files: Files, errors: string, name: string): Files => put(files, errors, `${files[errors]}export class ${name} extends Blueprint.error({}, { exit: 30 }) {}\n`);

describe("the runtime's refusals in the model of a chain project", () => {
  it("AR-001 to AR-006 are in the refusals map, and a declared error keeps its own prefix", () => {
    const m = compiles(CHAIN_BASE);
    expect(m.refusals).toMatchObject(RUNTIME);
    expect(m.refusals["AllowanceExceeded"]).toBe("AL-001");
    expect(Object.entries(m.refusals).filter(([, c]) => c.startsWith("AR-")).map(([n]) => n).sort()).toEqual(Object.keys(RUNTIME).sort());
  });
  it("a project with no chain store has only AR-001 and AR-002, as today", () => {
    const m = compiles(DB_BASE);
    expect(Object.entries(m.refusals).filter(([, c]) => c.startsWith("AR-"))).toEqual([["IdempotencyConflict", "AR-002"], ["NotAllowed", "AR-001"]]);
  });
});

describe("a declared error may not take a runtime name", () => {
  const FILE = inFile("blueprint/things/ticket/errors.ts");
  for (const name of ["NotAllowed", "IdempotencyConflict"]) {
    it(`controls, true today: ${name}`, () => refuses(withError(DB_BASE, "things/ticket/errors.ts", name), [FILE, word(name), /runtime/i]));
  }
  for (const name of ["SignatureExpired", "InvalidNonce", "BadSignature", "AlreadyExists"]) {
    it(`${name}, in a project with no chain store`, () => refuses(withError(DB_BASE, "things/ticket/errors.ts", name), [FILE, word(name), /runtime/i]));
    it(`${name}, on a chain-stored thing`, () => refuses(withError(CHAIN_BASE, "things/allowance/errors.ts", name), [inFile("blueprint/things/allowance/errors.ts"), word(name), /runtime/i]));
  }
});
