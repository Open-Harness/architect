import type { DecodedEvent, EventChange } from "@orthograph/chain-evm/device";
import { env, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { entryOf, fieldsOf } from "./internal/entries.ts";
import type { Follower } from "./service.ts";

const event = { eventName: "Echoed", args: { id: (1n << 130n) + 5n, by: "0xAbC0000000000000000000000000000000000001", digest: "0x01" }, address: "0x0", blockNumber: 5n, blockHash: "0xb1", transactionHash: "0xt", logIndex: 1 } as unknown as DecodedEvent;
const config = { chainId: 31337, contract: "Echo" };
const of = (change: EventChange<DecodedEvent>) => entryOf(config, change);

describe("what the follower tells its sink", () => {
  it("a confirmed event: id from the chain, block hash and log index; uint as a decimal string", () => {
    expect(of({ _tag: "Confirmed", event })).toEqual({ source: "chain", id: "31337:0xb1:1", event: "Echo.Echoed", fields: { id: ((1n << 130n) + 5n).toString(), by: "0xAbC0000000000000000000000000000000000001", digest: "0x01" } });
  });
  it("a correction of a confirmed event carries wasConfirmed; of an unconfirmed one, nothing; an observed one, nothing", () => {
    expect(of({ _tag: "Corrected", event, wasConfirmed: true })).toMatchObject({ id: "31337:0xb1:1:corrected", event: "Echo.EchoedCorrected", fields: { wasConfirmed: true } });
    expect(of({ _tag: "Corrected", event, wasConfirmed: false })).toBeUndefined();
    expect(of({ _tag: "Observed", event })).toBeUndefined();
  });
  it("nested values become JSON", () => {
    expect(fieldsOf({ a: [1n, { b: 2n }], c: "x" })).toEqual({ a: ["1", { b: "2" }], c: "x" });
  });
});

// The chain side (an alarm-driven poll handing a confirmed change on) is shown on Anvil by the Worker of the on-chain check; here the alarm itself, in workerd.
const configOf = (extra: object) => ({ rpcUrl: "http://127.0.0.1:1", chainId: 31337, contract: "Echo", address: "0x0000000000000000000000000000000000000001", event: { type: "event", name: "Echoed", inputs: [], anonymous: false }, fromBlock: "0", depth: 2, ...extra });

describe("the follower's alarm (M6-chain item 12)", () => {
  it("configure without pollIntervalMs sets no alarm; with one it sets exactly one, and the same call again sets no second", async () => {
    await runInDurableObject(env.FOLLOWER.getByName("alarm-none") as DurableObjectStub<Follower>, async (follower, state) => {
      await follower.configure(configOf({}));
      expect(await state.storage.getAlarm()).toBeNull();
    });
    await runInDurableObject(env.FOLLOWER.getByName("alarm-set") as DurableObjectStub<Follower>, async (follower, state) => {
      await follower.configure(configOf({ pollIntervalMs: 60_000 }));
      const first = await state.storage.getAlarm();
      expect(first).not.toBeNull();
      await follower.configure(configOf({ pollIntervalMs: 60_000 }));
      expect(await state.storage.getAlarm()).toBe(first);
    });
  });

  it("an alarm that meets an error (here an RPC that is not there) leaves the checkpoint where it was and sets the next alarm", async () => {
    const stub = env.FOLLOWER.getByName("alarm-error") as DurableObjectStub<Follower>;
    await runInDurableObject(stub, (follower) => follower.configure(configOf({ pollIntervalMs: 60_000 })));
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    await runInDurableObject(stub, async (follower, state) => {
      expect(await follower.checkpoint()).toEqual({ window: [] });
      expect(await state.storage.getAlarm()).not.toBeNull();
    });
  });
});

describe("configure and health", () => {
  it("a changed interval resets the alarm, and none deletes it", async () => {
    await runInDurableObject(env.FOLLOWER.getByName("reconfigure") as DurableObjectStub<Follower>, async (follower, state) => {
      await follower.configure(configOf({ pollIntervalMs: 600_000 }));
      const slow = (await state.storage.getAlarm())!;
      await follower.configure(configOf({ pollIntervalMs: 1_000 }));
      expect((await state.storage.getAlarm())!).toBeLessThan(slow);
      await follower.configure(configOf({}));
      expect(await state.storage.getAlarm()).toBeNull();
    });
  });

  it("the same source keeps the checkpoint; another one starts a new stream", async () => {
    await runInDurableObject(env.FOLLOWER.getByName("source") as DurableObjectStub<Follower>, async (follower, state) => {
      await follower.configure(configOf({}));
      await state.storage.put("checkpoint", { through: { number: 5n, hash: "0xab" }, window: [{ number: 5n, hash: "0xab" }], seen: [] });
      await follower.configure(configOf({ pollIntervalMs: 60_000 }));
      expect((await follower.checkpoint()).through).toEqual({ number: "5", hash: "0xab" });
      await follower.configure(configOf({ fromBlock: "9" }));
      expect(await follower.checkpoint()).toEqual({ window: [] });
    });
  });

  it("a failing alarm is recorded without the URL, counted, and the next alarm is set", async () => {
    const stub = env.FOLLOWER.getByName("health") as DurableObjectStub<Follower>;
    await runInDurableObject(stub, (follower) => follower.configure(configOf({ rpcUrl: "http://user:secret@127.0.0.1:1/key", pollIntervalMs: 60_000 })));
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    await runInDurableObject(stub, async (follower, state) => {
      const health = (await follower.health())!;
      expect(health.failures).toBe(2);
      expect(health.lastError).toMatchObject({ tag: "ChainFault", message: expect.any(String) });
      // An allow-list: the tag, the kind and a fixed sentence; none of the error's own words (it named the URL).
      expect(Object.keys(health.lastError).sort()).toEqual(["at", "kind", "message", "tag"]);
      expect(JSON.stringify(health)).not.toMatch(/secret|127\.0\.0\.1|http|:1\//);
      expect(await state.storage.getAlarm()).not.toBeNull();
    });
  });
});
