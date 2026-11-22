// `@orthograph/erc20`'s root export is its descriptor, as every plugin's is (M1-plugins; ST2-abi-adapters section 5).
import { readFileSync } from "node:fs";
import { Blueprint } from "orthograph";
import { describe, expect, it } from "vitest";
import adapter from "../adapter.ts";
import * as errors from "../generated/errors.ts";
import * as events from "../generated/events.ts";

type Item = { type: string; name: string; inputs: ReadonlyArray<{ name: string }> };
const abi = JSON.parse(readFileSync(new URL("../abi.json", import.meta.url), "utf8")) as ReadonlyArray<Item>;
const namesOf = (type: string) => abi.filter((item) => item.type === type).map((item) => item.name).sort();
const classes = [
  errors.ERC20InsufficientAllowance, errors.ERC20InsufficientBalance, errors.ERC20InvalidApprover,
  errors.ERC20InvalidReceiver, errors.ERC20InvalidSender, errors.ERC20InvalidSpender,
];

describe("the erc20 descriptor", () => {
  it("is a Blueprint.adapter with a description", () => {
    expect(adapter).toMatchObject({ kind: "adapter", choices: {} });
    expect(adapter.description.length).toBeGreaterThan(0);
  });

  it("has a call per ABI function, each an effect-mode call: nine, no more", () => {
    expect(Object.keys(adapter.calls).sort()).toEqual(namesOf("function"));
    expect(Object.keys(adapter.calls)).toHaveLength(9);
    for (const call of Object.values(adapter.calls)) expect(call).toMatchObject({ kind: "call", mode: "effect" });
  });

  it("declares on each call the six error classes, the very classes of generated/errors.ts", () => {
    for (const [name, call] of Object.entries(adapter.calls)) {
      expect(new Set(call.errors), name).toEqual(new Set(classes));
      expect(call.errors, name).toHaveLength(6);
    }
  });

  it("has an event per ABI event, the typed sources of generated/events.ts", () => {
    expect(Object.keys(adapter.events ?? {}).sort()).toEqual(namesOf("event"));
    expect(adapter.events?.["Transfer"]).toBe(events.Transfer);
    expect(adapter.events?.["Approval"]).toBe(events.Approval);
  });

  it("stands in with a process: Anvil, the real contract's own code", () => {
    expect(adapter.standIn).toMatchObject({ kind: "stand-in", how: "process" });
    expect(adapter.standIn?.how === "process" ? adapter.standIn.what : "").toContain("Anvil");
  });

  it("mounts: an app includes a call by name, and the mount's call is the adapter's", () => {
    const mount = Blueprint.use(adapter, (a) => [a.include(a.calls.transfer, a.calls.balanceOf)]);
    expect(mount).toMatchObject({ kind: "mount" });
    expect(mount.calls.transfer).toBe(adapter.calls.transfer);
  });
});

describe("the erc20 errors", () => {
  it("are Blueprint.error classes with the ABI's names and fields, each its own exit code", () => {
    const declared = Object.entries(errors).filter(([, value]) => typeof value === "function" && "exit" in value);
    expect(declared.map(([name]) => name).sort()).toEqual(namesOf("error"));
    for (const [name, cls] of declared) {
      const item = abi.find((i) => i.type === "error" && i.name === name);
      expect(Object.keys((cls as { fields: object }).fields).sort(), name).toEqual((item?.inputs ?? []).map((input) => input.name).sort());
    }
    const exits = declared.map(([, cls]) => (cls as { exit: number }).exit);
    expect(new Set(exits).size).toBe(6);
  });

  it("make an instance with the fields they were given", () => {
    const error = new errors.ERC20InsufficientBalance({ sender: "0x00000000000000000000000000000000000000a1", balance: 3n, needed: 4n });
    expect(error).toMatchObject({ sender: "0x00000000000000000000000000000000000000a1", balance: 3n, needed: 4n });
    expect(error).toBeInstanceOf(errors.ERC20InsufficientBalance);
  });

  it("are bound by code `erc20.<Error>` to their ABI item and make the class's instance from decoded fields", () => {
    expect(errors.bindings.map((b) => b.code).sort()).toEqual(namesOf("error").map((name) => `erc20.${name}`));
    const binding = errors.bindings.find((b) => b.code === "erc20.ERC20InsufficientBalance");
    expect(binding?.item).toMatchObject({ type: "error", name: "ERC20InsufficientBalance" });
    const made = binding?.make({ sender: "0x00000000000000000000000000000000000000a1", balance: 1n, needed: 2n });
    expect(made).toBeInstanceOf(errors.ERC20InsufficientBalance);
  });
});
