// The freshness check (ST2-abi-adapters section 6): until `ortho new adapter --from-abi` lands, the generator's own test
// regenerates `@orthograph/erc20` and fails if the checked-in files differ. Written by the checks author (ST2.02).
import { readdirSync, readFileSync } from "node:fs";
import { Effect } from "effect";
import { AbiAdapters } from "@orthograph/adapters-abi";
import { describe, expect, it } from "vitest";

const here = (path: string) => new URL(`../${path}`, import.meta.url);
const text = (path: string) => readFileSync(here(path), "utf8");
const abiJson: unknown = JSON.parse(text("abi.json"));
const bytecode = (JSON.parse(text("stand-in/bytecode.json")) as { bytecode: `0x${string}` }).bytecode;
const planned = () => Effect.runPromise(AbiAdapters.parse(abiJson).pipe(
  Effect.flatMap((abi) => AbiAdapters.plan({ name: "erc20", abiFile: "abi.json", abi, bytecode })),
));

describe("erc20's generated files", () => {
  it("are what plan writes from abi.json, byte for byte", async () => {
    const files = await planned();
    const generated = files.filter((f) => f.path.startsWith("generated/"));
    expect(generated.map((f) => f.path)).toEqual([
      "generated/calls.ts", "generated/errors.ts", "generated/events.ts", "generated/stand-in.ts", "generated/types.ts",
    ]);
    for (const file of generated) expect(text(file.path), file.path).toBe(file.content);
  });

  it("are the only files under generated/: nothing else lives there, nothing is left from an older plan", async () => {
    const files = await planned();
    expect(readdirSync(here("generated")).sort()).toEqual(files.filter((f) => f.path.startsWith("generated/")).map((f) => f.path.slice("generated/".length)));
  });

  it("include the scaffolded adapter, which opens as a scaffold and is not compared (it is theirs now)", async () => {
    const adapter = (await planned()).find((f) => f.path === "adapter.ts");
    expect(adapter?.content.split("\n")[0]).toBe("// Scaffolded from abi.json. Yours from now on.");
    expect(text("adapter.ts").split("\n")[0]).toBe("// Scaffolded from abi.json. Yours from now on.");
  });

  it("carry the stand-in's bytecode as bytecode.json holds it", async () => {
    const stand = (await planned()).find((f) => f.path === "generated/stand-in.ts");
    expect(stand?.content).toContain(bytecode);
  });
});

describe("erc20's abi.json", () => {
  type Item = { type: string; name: string; stateMutability?: string; inputs: ReadonlyArray<{ name: string; type: string; indexed?: boolean }> };
  const items = JSON.parse(text("abi.json")) as ReadonlyArray<Item>;
  const signature = (item: Item) => `${item.name}(${item.inputs.map((input) => input.type).join(",")})`;
  const of = (type: string) => items.filter((item) => item.type === type).map(signature).sort();

  it("holds the ERC-20 standard's nine functions", () => {
    expect(of("function")).toEqual([
      "allowance(address,address)", "approve(address,uint256)", "balanceOf(address)", "decimals()", "name()", "symbol()",
      "totalSupply()", "transfer(address,uint256)", "transferFrom(address,address,uint256)",
    ]);
    const mutability = Object.fromEntries(items.filter((i) => i.type === "function").map((i) => [i.name, i.stateMutability]));
    expect(mutability).toEqual({
      allowance: "view", approve: "nonpayable", balanceOf: "view", decimals: "view", name: "view", symbol: "view",
      totalSupply: "view", transfer: "nonpayable", transferFrom: "nonpayable",
    });
  });

  it("holds the standard's two events, with their indexed arguments", () => {
    expect(of("event")).toEqual(["Approval(address,address,uint256)", "Transfer(address,address,uint256)"]);
    const transfer = items.find((i) => i.type === "event" && i.name === "Transfer");
    expect(transfer?.inputs.map((i) => [i.name, i.indexed])).toEqual([["from", true], ["to", true], ["value", false]]);
  });

  it("holds OpenZeppelin 5's six ERC-6093 errors, and nothing else", () => {
    expect(of("error")).toEqual([
      "ERC20InsufficientAllowance(address,uint256,uint256)", "ERC20InsufficientBalance(address,uint256,uint256)",
      "ERC20InvalidApprover(address)", "ERC20InvalidReceiver(address)", "ERC20InvalidSender(address)", "ERC20InvalidSpender(address)",
    ]);
    expect(items).toHaveLength(9 + 2 + 6);
  });
});
