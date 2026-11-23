// Goal 4, slice 4 (M6.11), lock check, the chain half of `blueprint/refusals.lock`: the Solidity wire identity of a refusal a chain store raises, and `earlier`
// (`design/decisions/M6-chain.md` item 4: "Adding or retyping a field gives the code a new wire identity; the old one moves to `earlier`, so a client still decodes an
// older contract"). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. On the budgets shape (a chain store, a thing `allowance`, prefix AL, with the declared error AllowanceExceeded { remaining: uint128 }), `ortho generate`
// exits 0 and writes `blueprint/refusals.lock`, and `lockProblems` finds nothing wrong with it (so each `wire.solidity.selector` is the keccak of its signature). In it:
//   - AllowanceExceeded is AL-001 with `wire.solidity` `{ signature: "AllowanceExceeded(uint128)", selector }`, and its Effect identity `{ tag: "AllowanceExceeded" }`;
//   - the runtime's refusals the chain raises carry a Solidity wire: AR-001 `NotAllowed()`, AR-003 `SignatureExpired(uint256)`, AR-004 `InvalidNonce(uint256,uint256)`,
//     AR-005 `BadSignature()`, AR-006 `AlreadyExists(bytes32)`, each owned by `runtime`, each with its name as the Effect tag;
//   - the machine's refusal (AL-900) has a Solidity wire whose signature is of its name;
//   - adding a field to AllowanceExceeded, and retyping its field (uint128 to uint64), each keep AL-001, give it the new signature, and move the old Solidity identity (its
//     signature and selector) to `earlier`; both, applied one after the other, leave both old identities in `earlier`, in the order they were replaced;
//   - generating again, unchanged, changes the lock not at all.
//
// THIS FILE NEEDS `ortho generate` TO SUCCEED ON A CHAIN PROJECT, which M6-chain item 11 puts in slice 4 (M6.11): the Solidity wire entries come with the Solidity
// language. Slice 3's own check (`04-m6-10-refusals-lock`, `-lock-codes`) holds the lock's Effect wire and fields.
//
// THE CONTROLS are the lock reader's (`04-m6-10-refusals-lock.test.ts`: a selector that is not the keccak of its signature, a signature not of the name, an `earlier`
// that is empty or not a list) and `selectorOf`'s against the known selectors.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lockProblems } from "./chain-readers.ts";
import { CHAIN_BASE, projectOf, put, run, selectorOf, swap, type Files } from "./chain-fixture.ts";

type Wire = { effect?: { tag: string }; solidity?: { signature: string; selector: string } };
type Entry = { name: string; owner: string; fields: Record<string, unknown>; wire: Wire; earlier: Wire[] };
type Lock = { refusals: Record<string, Entry>; retired: Record<string, Entry> };
const ERRORS = "things/allowance/errors.ts";
const sol = (signature: string) => ({ signature, selector: selectorOf(signature) });

const generate = (files: Files, then: ReadonlyArray<(f: Files) => Files> = []) => {
  const p = projectOf(files);
  try {
    const locks: Lock[] = [];
    let current = files;
    for (const step of [(f: Files) => f, ...then]) {
      current = step(current);
      for (const [f, t] of Object.entries(current)) if (t !== null) writeFileSync(join(p.root, "blueprint", f), t);
      const g = run(p.root, "generate");
      expect(g.status, `ortho generate on a chain project should succeed: ${g.err}${g.out.slice(-600)}`).toBe(0);
      const path = join(p.root, "blueprint/refusals.lock");
      expect(existsSync(path), "ortho generate wrote no blueprint/refusals.lock").toBe(true);
      const text = readFileSync(path, "utf8");
      const opts = { prefixes: { allowance: "AL" }, solidity: true };
      expect(lockProblems(text, opts), lockProblems(text, opts).join("\n")).toEqual([]);
      locks.push(JSON.parse(text) as Lock);
    }
    return locks;
  } finally { p.remove(); }
};

const exceeded = (fields: string) => (f: Files): Files => put(f, ERRORS, `import { Blueprint } from "orthograph";\nimport { Allowance } from "./thing.ts";\n\nexport class AllowanceExceeded extends Blueprint.error({ ${fields} }, { exit: 41 }) {}\n`);

describe("the lock of a chain project holds the Solidity wire of what the chain raises", () => {
  it("AllowanceExceeded is AL-001 with its signature; the runtime's chain refusals are AR-001 and AR-003 to AR-006; the machine's has a wire of its own name", () => {
    const [lock] = generate(CHAIN_BASE);
    expect(lock!.refusals["AL-001"]).toMatchObject({ name: "AllowanceExceeded", owner: "allowance", wire: { effect: { tag: "AllowanceExceeded" }, solidity: sol("AllowanceExceeded(uint128)") }, earlier: [] });
    const runtime: ReadonlyArray<readonly [string, string, string]> = [["AR-001", "NotAllowed", "NotAllowed()"], ["AR-003", "SignatureExpired", "SignatureExpired(uint256)"], ["AR-004", "InvalidNonce", "InvalidNonce(uint256,uint256)"], ["AR-005", "BadSignature", "BadSignature()"], ["AR-006", "AlreadyExists", "AlreadyExists(bytes32)"]];
    for (const [code, name, signature] of runtime) expect(lock!.refusals[code], code).toMatchObject({ name, owner: "runtime", wire: { effect: { tag: name }, solidity: sol(signature) } });
    expect(lock!.refusals["AL-900"]?.wire.solidity?.signature).toMatch(/^AllowanceNotActive\(/);
    expect(lock!.refusals["AL-900"]?.wire.solidity?.selector).toBe(selectorOf(lock!.refusals["AL-900"]!.wire.solidity!.signature));
  });
  it("generating again, unchanged, changes the lock not at all", () => {
    const [a, b] = generate(CHAIN_BASE, [(f) => f]);
    expect(b).toEqual(a);
  });
});

describe("a changed shape keeps the code and moves the old wire identity to earlier", () => {
  it("adding a field: AL-001 keeps its code, takes the new signature, and the old one is in earlier", () => {
    const [first, second] = generate(CHAIN_BASE, [exceeded("remaining: Blueprint.money.of(Allowance.fields.token), limit: Blueprint.money.of(Allowance.fields.token)")]);
    expect(second!.refusals["AL-001"]?.name).toBe("AllowanceExceeded");
    expect(second!.refusals["AL-001"]?.wire.solidity).toEqual(sol("AllowanceExceeded(uint128,uint128)"));
    expect(second!.refusals["AL-001"]?.earlier.map((w) => w.solidity)).toEqual([first!.refusals["AL-001"]!.wire.solidity]);
    expect(second!.retired).toEqual({});
  });
  it("retyping a field: the old identity is in earlier", () => {
    const [, second] = generate(CHAIN_BASE, [exceeded("remaining: Blueprint.uint(64)")]);
    expect(second!.refusals["AL-001"]?.wire.solidity).toEqual(sol("AllowanceExceeded(uint64)"));
    expect(second!.refusals["AL-001"]?.earlier.map((w) => w.solidity)).toContainEqual(sol("AllowanceExceeded(uint128)"));
  });
  it("two changes in a row leave both old identities, the older first", () => {
    const [, , third] = generate(CHAIN_BASE, [exceeded("remaining: Blueprint.money.of(Allowance.fields.token), limit: Blueprint.money.of(Allowance.fields.token)"), exceeded("remaining: Blueprint.uint(64), limit: Blueprint.money.of(Allowance.fields.token)")]);
    expect(third!.refusals["AL-001"]?.wire.solidity).toEqual(sol("AllowanceExceeded(uint64,uint128)"));
    expect(third!.refusals["AL-001"]?.earlier.map((w) => w.solidity)).toEqual([sol("AllowanceExceeded(uint128)"), sol("AllowanceExceeded(uint128,uint128)")]);
  });
  it("a change that leaves the signature alone (a field renamed's type kept) is not a new identity: the same signature stays current and nothing moves", () => {
    const [first, second] = generate(CHAIN_BASE, [(f) => swap(f, ERRORS, "remaining: Blueprint.money.of(Allowance.fields.token)", "left: Blueprint.money.of(Allowance.fields.token)")]);
    expect(second!.refusals["AL-001"]?.wire.solidity).toEqual(first!.refusals["AL-001"]!.wire.solidity);
    expect(second!.refusals["AL-001"]?.earlier).toEqual([]);
  });
});
