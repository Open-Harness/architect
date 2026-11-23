// The lifecycle of one transfer: simulated, then submitted, then included (K7 Q3). Simulation is not an option here: the
// chain port itself refuses to sign or submit what has not passed it (M1.32).
import { Effect, Stream } from "effect";
import type { Timers } from "@orthograph/language-effect";
import type { ChainError, ChainPort, Submission, Unsigned } from "@orthograph/chain-evm/device";
import { KeyLocked, SimulationReverted } from "../../../../blueprint/things/wallet/errors.js";
import type { ChainSetting } from "../../chain/types.ts";
import type { Sent } from "../types.ts";

/** What a fault of the chain is, said without the provider's own text. */
const describe = (error: ChainError) => (error._tag === "ChainRefusal" ? `the contract refused it as ${error.name}` : `${error.kind}: ${error.message}`);

/** What a fault of the chain is to the person asking: a refused transfer, a signer that would not, or a defect. */
export const refused = (error: ChainError): Effect.Effect<never, SimulationReverted | KeyLocked> => {
  if (error._tag === "ChainRefusal" || error.kind === "revert" || error.kind === "panic" || error.kind === "funds") {
    return Effect.logInfo(`the chain's simulation refused the transfer before anything was signed or sent (${describe(error)})`).pipe(
      Effect.andThen(Effect.fail(new SimulationReverted({}))),
    );
  }
  if (error.kind === "rejected" || error.kind === "signing") {
    return Effect.logInfo(`the signer would not sign (${describe(error)})`).pipe(Effect.andThen(Effect.fail(new KeyLocked({}))));
  }
  // Nothing the person can fix in a send: an unreachable chain, a wrong endpoint, a timeout.
  return Effect.die(new Error(`the chain could not be used: ${describe(error)}`));
};

/** The depth a send needs, or the defect that says where to declare it: asked first, before anything is prepared, signed or sent. */
export const depthOf = (setting: ChainSetting): Effect.Effect<number> =>
  setting.depth === undefined
    ? Effect.die(new Error(`chain ${setting.chainId} has no confirmation depth: set ORTHO_WALLET_DEPTH (the blocks that count before a send is confirmed, the one it is in as the first); only a local chain (31337) is depth 1 without it`))
    : Effect.succeed(setting.depth);

/** One `wallet.send.level` span for a block count: `confirmed` once as many blocks count as the depth asks, `submitted` before. */
const levelSpan = (depth: number, blocks: number) =>
  Effect.void.pipe(Effect.withSpan("wallet.send.level", { attributes: { level: blocks >= depth ? "confirmed" : "submitted", blocks } }));

/**
 * Follow a submission until it is `depth` blocks deep, the block it is in as the first. Each time the count changes a
 * `wallet.send.level` span says what it is, from 0 (submitted, in no block) to the depth (confirmed); the send answers
 * only at the last. A transfer mined and reverted is refused whatever the depth.
 */
export const follow = (port: ChainPort, submission: Submission, depth: number): Effect.Effect<Sent, SimulationReverted | KeyLocked, Timers> =>
  Effect.gen(function* () {
    yield* levelSpan(depth, 0);
    const states = yield* port.track(submission, { depth }).pipe(
      Stream.tap((state) => (state._tag === "Deepened" ? levelSpan(depth, state.blocks) : Effect.void)),
      Stream.runCollect,
      Effect.catch(refused),
    );
    if (states.some((s) => s._tag === "Reverted")) {
      return yield* Effect.logInfo("the transfer was mined and reverted").pipe(Effect.andThen(Effect.fail(new SimulationReverted({}))));
    }
    // A Dropped after an Included voids that inclusion (a reorg): only the last Deepened of an inclusion still standing counts.
    const standing = states.reduce<{ included: boolean; blocks: number }>((now, s) =>
      s._tag === "Included" ? { included: true, blocks: 0 }
        : s._tag === "Dropped" ? { included: false, blocks: 0 }
        : s._tag === "Deepened" && now.included ? { included: true, blocks: s.blocks }
        : now, { included: false, blocks: 0 });
    if (!standing.included) return yield* Effect.die(new Error("the transfer was never included: it was replaced or dropped"));
    if (standing.blocks < depth) return yield* Effect.die(new Error(`the transfer was included but never ${depth} blocks deep`));
    return { transaction: submission.hash, level: "confirmed", nonce: BigInt(submission.nonce) } satisfies Sent;
  });

/** Give the nonce a prepared transaction took back, whatever became of it. */
export const settle = (port: ChainPort, unsigned: Unsigned) => port.release(unsigned);
