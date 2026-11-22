// An ABI `plan` can't map is refused with the item named, never guessed (ST2-abi-adapters section 2).
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { param, planOf, refusalOf } from "./internal/abis.ts";
import type { AbiItem, AbiParameter } from "./types.ts";

const fn = (name: string, inputs: ReadonlyArray<AbiParameter>, outputs: ReadonlyArray<AbiParameter> = []): AbiItem =>
  ({ type: "function", name, stateMutability: "nonpayable", inputs, outputs });

const refused = (abi: ReadonlyArray<AbiItem>) => Effect.runPromise(refusalOf(abi));

describe("plan refuses, naming the item", () => {
  it("an unnamed tuple component", async () => {
    const error = await refused([fn("sendPair", [param("tuple", "pair", { components: [param("uint256", "a"), param("address", "")] })])]);
    expect(error).toMatchObject({ _tag: "AbiRefused" });
    expect(error.item).toContain("sendPair");
    expect(error.reason.length).toBeGreaterThan(0);
  });

  it("an unnamed input of a function, an event and an error", async () => {
    const function_ = await refused([fn("noName", [param("uint256", "")])]);
    expect(function_.item).toContain("noName");
    const event = await refused([{ type: "event", name: "Quiet", inputs: [param("uint256", "", { indexed: false })] }]);
    expect(event.item).toContain("Quiet");
    const error = await refused([{ type: "error", name: "Mute", inputs: [param("uint256", "")] }]);
    expect(error.item).toContain("Mute");
  });

  it("several outputs when one has no name", async () => {
    const error = await refused([fn("pair", [], [param("uint256", "left"), param("uint256", "")])]);
    expect(error.item).toContain("pair");
  });

  it("two parameters of one name", async () => {
    const error = await refused([fn("twin", [param("uint256", "x"), param("address", "x")])]);
    expect(error.item).toContain("twin");
  });

  it("a type with no mapping (a fixed-point number, a function pointer)", async () => {
    expect((await refused([fn("fixed", [param("fixed128x18", "x")])])).item).toContain("fixed");
    expect((await refused([fn("pointer", [param("function", "f")])])).item).toContain("pointer");
  });

  it("a name it can't disambiguate: two overloads that name one function twice, a type another item already took", async () => {
    const clash = await refused([
      fn("transferEvent", [param("address", "x")]),
      { type: "event", name: "Transfer", inputs: [param("address", "x")] },
    ]);
    expect(clash.item).toMatch(/transferEvent|Transfer/);
    const taken = await refused([fn("f_1", []), fn("f", []), fn("f", [param("bool", "x")])]);
    expect(taken.item).toMatch(/\bf\b|f_1/);
  });

  it("and plans a clean ABI beside them (a refusal is the item's, not the whole ABI's)", async () => {
    await expect(Effect.runPromise(planOf([fn("fine", [param("uint256", "x")])]))).resolves.toHaveLength(5);
  });
});
