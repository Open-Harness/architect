import { Timers } from "@orthograph/language-effect";
import { Effect, Stream } from "effect";
import { TestClock } from "effect/testing";
import { createPublicClient, custom, HttpRequestError, parseAbi } from "viem";
import { expect, test } from "vitest";
import type { DecodedEvent, EventFollower, EventPoll } from "../events/types.ts";
import { makeEventSource } from "../events/service.ts";
import { receiptError } from "./internal/receipt.ts";
import { trackTransaction } from "./internal/tracker.ts";
import type { Rpc } from "./internal/rpc.ts";
import type { Intent, Submission } from "./types.ts";

const client = createPublicClient({ transport: custom({ request: () => Promise.resolve(null) }, { retryCount: 0 }) });
const rpc: Rpc = (read) => Effect.tryPromise({ try: () => read(client), catch: (error) => error });
const timers = Timers.of({
  at: () => Effect.die("Tracker unit tests only use sleeps"),
  sleep: () => Effect.void,
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});
const submission: Submission = {
  hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  from: "0x0000000000000000000000000000000000000001", nonce: 0, fromBlock: 0n,
};
const source = makeEventSource(parseAbi(["event Sent(uint256 value)"])[0], submission.from, 0n);
const event: DecodedEvent = {
  address: submission.from, args: { value: 1n }, blockNumber: 0n, blockHash: submission.hash,
  eventName: "Sent", transactionHash: submission.hash, logIndex: 0,
};
const empty: EventPoll<DecodedEvent> = {
  checkpoint: { through: undefined, window: [], seen: [] },
  caughtUp: true, headTimestamp: 10n, changes: [],
};

const track = (intent: Intent, poll: EventFollower<DecodedEvent>["poll"]) =>
  trackTransaction(rpc, timers, { chainId: 1, rpcUrl: "http://unused.invalid" }, 1, 1_000, () => Effect.succeed(0),
    submission, intent, { poll, stream: () => Stream.empty });

test("a late confirmation remains valid when the checkpoint has already pruned the event", () => {
  let polls = 0;
  const intent = { source, matches: () => true };
  const result = track(intent, () => Effect.gen(function* () {
    if (polls++ === 0) {
      yield* TestClock.adjust("2 seconds");
      return { ...empty, changes: [{ _tag: "Confirmed", event }] };
    }
    return { ...empty, changes: [{ _tag: "Corrected", event, wasConfirmed: true }] };
  }));
  return Effect.runPromise(result.pipe(Stream.take(2), Stream.runCollect, Effect.provide(TestClock.layer()))).then((changes) => {
    expect(changes.map(({ _tag }) => _tag)).toEqual(["Confirmed", "Corrected"]);
  });
});

test("the on-chain intent deadline drops an intent that has no matching event", () =>
  Effect.runPromise(track({ source, matches: () => true, deadline: 9n }, () => Effect.succeed(empty)).pipe(Stream.runCollect))
    .then((changes) => expect(changes).toMatchObject([{ _tag: "Dropped", reason: "deadline", hash: submission.hash }])));

// The confirmation-depth read goes through the same retry the receipt reads use: `retryRead` (internal/receipt-retry.ts),
// three transient retries with exponential backoff parked on `Timers.sleep` (`readReceipt` in internal/receipt.ts uses it).
const hexReceipt = {
  transactionHash: submission.hash, blockHash: "0x00000000000000000000000000000000000000000000000000000000000000b1",
  blockNumber: "0x1", transactionIndex: "0x0", from: submission.from, to: submission.from, cumulativeGasUsed: "0x5208",
  gasUsed: "0x5208", effectiveGasPrice: "0x1", status: "0x1", logs: [], logsBloom: `0x${"0".repeat(512)}`, type: "0x2", contractAddress: null,
};
const flaky = (status: number) => {
  let failed = false;
  const flakyClient = createPublicClient({
    transport: custom({
      request: ({ method }: { method: string }) => {
        if (method === "eth_getTransactionReceipt") return Promise.resolve(hexReceipt);
        if (method === "eth_blockNumber") {
          if (!failed) {
            failed = true;
            return Promise.reject(new HttpRequestError({ url: "http://unused.invalid", status }));
          }
          return Promise.resolve("0x1");
        }
        return Promise.reject(new Error(`unexpected ${method}`));
      },
    }, { retryCount: 0 }),
  });
  const flakyRpc: Rpc = (read) => Effect.tryPromise({ try: () => read(flakyClient), catch: (error) => error });
  return { rpc: flakyRpc, failed: () => failed };
};

test.each([429, 503])("a %i on the block-number read after mining is retried, and the send still confirms", (status) => {
  const { rpc: flakyRpc, failed } = flaky(status);
  return Effect.runPromise(
    trackTransaction(flakyRpc, timers, { chainId: 1, rpcUrl: "http://unused.invalid" }, 1, 60_000, () => Effect.succeed(0),
      submission, undefined, undefined, 1).pipe(Stream.runCollect),
  ).then((states) => {
    expect(failed()).toBe(true);
    expect(states.map(({ _tag }) => _tag)).toEqual(["Included", "Deepened"]);
  });
});

test("a stalled optional trace returns the uncoded mined revert", () =>
  Effect.runPromise(receiptError(
    { chainId: 1, rpcUrl: "http://unused.invalid", traceRevert: () => Effect.never },
    timers, submission, submission.hash,
  )).then((error) => expect(error).toMatchObject({ _tag: "ChainFault", kind: "revert" })));
