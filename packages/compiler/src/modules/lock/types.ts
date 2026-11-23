// `blueprint/refusals.lock` (M6-chain item 4): every refusal of the project with the code it keeps for good. Written by
// `ortho generate`, checked in, append-only; the compiler reads it, so every generator reads codes from the model.
import { Data, type Effect } from "effect";

/** A field of a refusal, as the lock writes a value: the kind and what the kind needs, nothing else. */
export type LockValue =
  | { readonly value: "uint"; readonly bits: number }
  | { readonly value: "id"; readonly prefix: string }
  | { readonly value: "text"; readonly max: number }
  | { readonly value: "account" }
  | { readonly value: "schema" }
  | { readonly value: "money"; readonly bits: number; readonly signed: boolean; readonly asset: { readonly token: string } | { readonly currency: string } | { readonly field: string } };

/** How a refusal goes on the wire in one language: Effect's tag, Solidity's signature and its selector (slice 4). */
export interface Wire {
  readonly effect?: { readonly tag: string };
  readonly solidity?: { readonly signature: string; readonly selector: string };
}

export interface LockEntry {
  readonly name: string;
  /** A thing's name, or `runtime` for the AR- codes. */
  readonly owner: string;
  /** The errors file it is declared in; absent for a generated refusal (the machine's, not-found) and the runtime's. */
  readonly from?: string;
  readonly fields: Readonly<Record<string, LockValue>>;
  readonly wire: Wire;
  /** Wire identities this code had before, kept so an old contract still decodes. */
  readonly earlier: ReadonlyArray<Wire>;
}

export interface Lock {
  readonly refusals: Readonly<Record<string, LockEntry>>;
  /** Code to the entry as it was when its name left the blueprint. A retired code is never given again. */
  readonly retired: Readonly<Record<string, LockEntry>>;
}

/** One refusal the blueprint declares or generates now: what the lock must hold for it. */
export interface Wanted {
  readonly name: string;
  readonly owner: string;
  readonly from?: string;
  readonly fields: Readonly<Record<string, LockValue>>;
  /** A code that is not numbered by order: the runtime's, the machine's 900 and not-found's 901. Absent for a declared error. */
  readonly code?: string;
  /** The thing's code prefix, for a declared error's next number. */
  readonly prefix: string;
}

/** Text that is no refusals lock: the compiler refuses the project, naming the file. */
export class LockInvalid extends Data.TaggedError("LockInvalid")<{ readonly message: string }> {}

export interface LockApi {
  /** The lock a text holds, an empty one for no text. */
  readonly parse: (text: string | undefined) => Effect.Effect<Lock, LockInvalid>;
  /** The lock after the blueprint: names keep their codes, new names take the next unused number, a name that left is retired. */
  readonly evolve: (before: Lock, wanted: ReadonlyArray<Wanted>) => Lock;
  /** `evolve`, and the code each wanted refusal got, in the order asked. */
  readonly assign: (before: Lock, wanted: ReadonlyArray<Wanted>) => { readonly lock: Lock; readonly codes: ReadonlyArray<string> };
  /** The runtime's refusals a project has, as the lock wants them: the chain's four only with a chain store. */
  readonly runtime: (chain: boolean) => ReadonlyArray<Wanted>;
  /** The exact text of a lock: JSON with two spaces and a closing newline. */
  readonly text: (lock: Lock) => string;
  /** Each live refusal's name and its code. */
  readonly codes: (lock: Lock) => Readonly<Record<string, string>>;
}
