// Conformance, for a contract: the ABI against the deployed code (ST2-abi-adapters section 8), on Anvil. Gated: ORTHO_CHAIN_EVM_ANVIL=1.
// The real stand-in must agree with `erc20/abi.json`; a planted contract (fixtures/Broken.sol) disagrees in four named ways.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { anvilOn, bindings, brokenBytecode, erc20Abi, onChain, tokenBytecode } from "../../../test/support.ts";
import { Conformance } from "./service.ts";

const anvil = it.skipIf(!anvilOn);
const timeout = 120_000;
const names = (kind: "function" | "event") => erc20Abi.flatMap((i) => (i.type === kind ? [`${kind} ${(i as { name: string }).name}`] : []));
const run = (bytecode: `0x${string}`) => onChain(bytecode, () => Conformance.run({ abi: erc20Abi, errors: bindings }));

describe("Conformance.run, on Anvil", () => {
  anvil("passes against the stand-in: every function and event agrees, nothing disagrees", async () => {
    const report = await run(tokenBytecode);
    expect(report.disagreements).toEqual([]);
    expect(report.ok).toBe(true);
    expect([...report.agrees]).toEqual([...names("function"), ...names("event")].sort());
  }, timeout);

  anvil("names each disagreement of a contract that lacks approve and decimals, whose transfer(1) reverts with an undeclared error, and that never emits Approval", async () => {
    const report = await run(brokenBytecode);
    expect(report.ok).toBe(false);
    expect(report.disagreements.map(({ item, kind }) => ({ item, kind }))).toEqual([
      { item: "event Approval", kind: "event-not-emitted" },
      { item: "function approve", kind: "no-such-function" },
      { item: "function decimals", kind: "no-such-function" },
      { item: "function transfer", kind: "undeclared-revert" },
    ]);
    for (const disagreement of report.disagreements) expect(disagreement.detail.length).toBeGreaterThan(0);
  }, timeout);

  anvil("lists what agrees beside what does not: the other functions and the Transfer event", async () => {
    const report = await run(brokenBytecode);
    expect([...report.agrees]).toEqual([
      "event Transfer", "function allowance", "function balanceOf", "function name", "function symbol", "function totalSupply", "function transferFrom",
    ]);
  }, timeout);

  anvil("reports the same twice (it sends writes, and the second run still agrees)", async () => {
    const reports = await onChain(tokenBytecode, () => Effect.gen(function* () {
      const first = yield* Conformance.run({ abi: erc20Abi, errors: bindings });
      return [first, yield* Conformance.run({ abi: erc20Abi, errors: bindings })] as const;
    }));
    expect(reports[0].ok).toBe(true);
    expect(reports[1]).toEqual(reports[0]);
  }, timeout);

  anvil("an ABI function the code lacks is named even when it is the only one: a one-function ABI", async () => {
    const onlyApprove = erc20Abi.filter((i) => i.type === "function" && (i as { name: string }).name === "approve");
    const report = await onChain(brokenBytecode, () => Conformance.run({ abi: onlyApprove, errors: bindings }));
    expect(report.disagreements.map((d) => d.item)).toEqual(["function approve"]);
    expect(report.agrees).toEqual([]);
  }, timeout);
});
