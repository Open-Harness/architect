import { describe, expect, it } from "vitest";
import { Chain } from "./service.ts";

describe("chains", () => {
  it("name a network and a token contract, as frozen data", () => {
    expect(Chain.evm.network("anvil")).toEqual({ kind: "chain", of: "evm", network: "anvil" });
    expect(Chain.evm.token("0x5FbDB2315678afecb367f032d93F642f64180aa3")).toEqual({ kind: "chain-token", of: "evm", address: "0x5FbDB2315678afecb367f032d93F642f64180aa3" });
    expect(Object.isFrozen(Chain.evm.network("anvil"))).toBe(true);
  });
});
