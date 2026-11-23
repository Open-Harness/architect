import type { Brand, Effect } from "effect";
import type { KeyLocked, NoSuchKey, SimulationReverted } from "../../../blueprint/things/wallet/errors.js";
import type { Signer, SignerName } from "../signer/types.ts";

/** What each of the five operations does on any host, given how the host finds its signers. Payloads and answers are the declarations'. */
export interface Operations<R> {
  readonly create: (payload: { readonly signer: string; readonly label: string }) => Effect.Effect<{ readonly wallet: string & Brand.Brand<"wal">; readonly account: string }, KeyLocked, R>;
  readonly import: (payload: { readonly signer: string; readonly label: string; readonly source: string }) => Effect.Effect<{ readonly wallet: string & Brand.Brand<"wal">; readonly account: string }, KeyLocked, R>;
  readonly keys: (payload: { readonly signer: string }) => Effect.Effect<{ readonly count: bigint; readonly accounts: string }, KeyLocked, R>;
  readonly sign: (payload: { readonly signer: string; readonly label: string; readonly message: string }) => Effect.Effect<{ readonly signature: string }, KeyLocked | NoSuchKey, R>;
  readonly send: (payload: { readonly signer: string; readonly label: string; readonly to: string; readonly value: bigint }) => Effect.Effect<{ readonly transaction: string; readonly level: string; readonly nonce: bigint }, SimulationReverted | KeyLocked | NoSuchKey, R>;
}

export interface OperationsApi {
  /** The five operations on a host whose signers `signerOf` finds. A name that is no signer is refused as `KeyLocked`. */
  readonly on: <R>(signerOf: (name: SignerName) => Effect.Effect<Signer, never, R>) => Operations<R>;
}
