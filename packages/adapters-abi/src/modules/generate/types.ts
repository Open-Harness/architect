// generate: an ABI's JSON in, the files of an adapter package out. Pure: no chain, no file read, no clock (ST2-abi-adapters
// section 2 and 5). `ortho new adapter <name> --from-abi <file>` (Goal 3's) calls `parse` then `plan` and writes what it answers.
import { Data, type Effect } from "effect";

/** One parameter of an ABI item, as the compiler's JSON writes it. */
export interface AbiParameter {
  readonly name: string;
  readonly type: string;
  readonly indexed?: boolean;
  readonly internalType?: string;
  readonly components?: ReadonlyArray<AbiParameter>;
}

export type AbiStateMutability = "pure" | "view" | "nonpayable" | "payable";

export interface AbiFunctionItem {
  readonly type: "function";
  readonly name: string;
  readonly inputs: ReadonlyArray<AbiParameter>;
  readonly outputs: ReadonlyArray<AbiParameter>;
  readonly stateMutability: AbiStateMutability;
}

export interface AbiEventItem {
  readonly type: "event";
  readonly name: string;
  readonly inputs: ReadonlyArray<AbiParameter>;
  readonly anonymous?: boolean;
}

export interface AbiErrorItem {
  readonly type: "error";
  readonly name: string;
  readonly inputs: ReadonlyArray<AbiParameter>;
}

/** Items `plan` reads past: a constructor, a fallback and a receive function are not calls. */
export interface AbiOtherItem {
  readonly type: "constructor" | "fallback" | "receive";
  readonly inputs?: ReadonlyArray<AbiParameter>;
  readonly stateMutability?: AbiStateMutability;
}

export type AbiItem = AbiFunctionItem | AbiEventItem | AbiErrorItem | AbiOtherItem;

export interface PlanInput {
  /** The adapter's name: `erc20`. It prefixes each error's code (`erc20.ERC20InsufficientBalance`) and names the descriptor. */
  readonly name: string;
  /** The ABI file's name as the header says it: `abi.json`. */
  readonly abiFile: string;
  readonly abi: ReadonlyArray<AbiItem>;
  /** The stand-in's deployment bytecode. With it `plan` also writes `generated/stand-in.ts`. */
  readonly bytecode?: `0x${string}`;
}

/** One file of the package: its path from the package's root and its whole text. */
export interface PlannedFile {
  readonly path: string;
  readonly content: string;
}

/** An ABI the generator can't map: the item named (`function transfer`, `event Transfer`, `error Oops`) and why. Never guessed. */
export class AbiRefused extends Data.TaggedError("AbiRefused")<{
  readonly item: string;
  readonly reason: string;
}> {}

export interface AbiAdaptersApi {
  /**
   * An ABI file's parsed JSON as items: refused (`AbiRefused`, item `abi`) when it is not an array of objects each with a
   * known `type`, and (item named) when a function, event or error has no name or no `inputs` list. Nothing else is judged here.
   */
  readonly parse: (json: unknown) => Effect.Effect<ReadonlyArray<AbiItem>, AbiRefused>;
  /**
   * The files of an adapter package, sorted by path, in the shape ST2.02 fixes (see README.md):
   * `adapter.ts` (`// Scaffolded from <abiFile>. Yours from now on.`), and `generated/types.ts`, `generated/calls.ts`,
   * `generated/events.ts`, `generated/errors.ts` (each opens `// Generated from <abiFile>. Do not edit.`), and
   * `generated/stand-in.ts` when `bytecode` is given. The same input always gives the same files, byte for byte.
   */
  readonly plan: (input: PlanInput) => Effect.Effect<ReadonlyArray<PlannedFile>, AbiRefused>;
}
