// Adapted from @prb/effect-evm@5.0.3 src/tx/{manager,policy}.ts. See LICENSE-prb-effect-evm.
import { Timers } from "@orthograph/language-effect";
import { Effect } from "effect";
import { makeFollower } from "../events/service.ts";
import { rpcFault, validateRefusalLock } from "../faults/service.ts";
import { ChainFault } from "../faults/types.ts";
import { makeTransactionManager } from "./internal/manager.ts";
import { makeRpc } from "./internal/rpc.ts";
import { probeSubmission } from "./internal/probe.ts";
import { trackTransaction } from "./internal/tracker.ts";
import type { ChainPort, ChainPortOptions } from "./types.ts";

export const makeChainPort = (options: ChainPortOptions): Effect.Effect<ChainPort, ChainFault, Timers> =>
  Effect.gen(function* () {
    const timers = yield* Timers;
    const interval = options.pollIntervalMs ?? 4_000;
    const timeout = options.receiptTimeoutMs ?? 120_000;
    const rpcTimeout = options.rpcTimeoutMs ?? 10_000;
    const url = URL.canParse(options.rpcUrl) ? new URL(options.rpcUrl) : undefined;
    const validNumber = (value: number) => Number.isSafeInteger(value) && value > 0;
    if ((url?.protocol !== "http:" && url?.protocol !== "https:") ||
        !validNumber(options.chainId) || !validNumber(interval) || !validNumber(timeout) || !validNumber(rpcTimeout)) {
      return yield* new ChainFault({ kind: "configuration", message: "Invalid EVM RPC URL, chain ID or polling policy" });
    }
    yield* validateRefusalLock(options.refusals ?? []);
    const rpc = makeRpc(options.rpcUrl, timers, rpcTimeout);
    const chainId = yield* rpc((client) => client.getChainId()).pipe(Effect.mapError((error) => rpcFault(error)));
    if (chainId !== options.chainId) {
      return yield* new ChainFault({ kind: "configuration", message: "EVM RPC chain ID does not match the port's chain ID" });
    }
    const manager = yield* makeTransactionManager(rpc, options);
    const follow: ChainPort["follow"] = (source, level) => makeFollower(rpc, timers, interval, source, level);
    const track: ChainPort["track"] = (submission, level, intent) => trackTransaction(
      rpc, timers, options, interval, timeout, manager.nonces.nonceAtHead, submission, intent,
      intent === undefined ? undefined : follow(intent.source, level),
      "depth" in level ? level.depth : undefined,
    );
    return { prepare: manager.prepare, simulate: manager.simulate, read: manager.read, sign: manager.sign, submit: manager.submit, replace: manager.replace, track, follow, release: manager.release, resume: manager.resume, hold: manager.hold, fill: manager.fill,
      probe: (submission) => probeSubmission(rpc, timers, manager.nonces.nonceAtHead, submission) };
  });
