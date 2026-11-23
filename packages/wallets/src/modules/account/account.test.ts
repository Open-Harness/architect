import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { Account } from "./service.ts";

const address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

describe("Account", () => {
  it("formats and parses a CAIP-10 account", () => {
    const text = Account.format({ chainId: 31337, address });
    expect(text).toBe(`eip155:31337:${address}`);
    expect(Account.parse(text)).toEqual(Option.some({ chainId: 31337, address }));
  });

  it("takes a bare address on the given chain, and refuses what is not an EIP-155 account", () => {
    expect(Account.parse(address, 5)).toEqual(Option.some({ chainId: 5, address }));
    expect(Option.isNone(Account.parse(address))).toBe(true);
    expect(Option.isNone(Account.parse("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"))).toBe(true);
    expect(Option.isNone(Account.parse("eip155:1:0x1234"))).toBe(true);
  });

  it("makes the wallet's id from the address, in the shape an id has", () => {
    expect(Account.idOf(address)).toMatch(/^wal_[0-9a-z]{16}$/);
    expect(Account.idOf(address)).toBe(Account.idOf(address.toLowerCase() as typeof address));
  });
});
