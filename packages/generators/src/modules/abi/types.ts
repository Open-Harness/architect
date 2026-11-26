// An adapter generated from contracts' ABIs (unit A1, #1164; design/decisions/CX-from-abi.md): what goes in, what comes out,
// and why an ABI is refused. The shape of the files is README.md's.
import { Data, type Effect } from "effect";
import type { PluginFile } from "../adapter/types.ts";

export type { PluginFile };

/** One contract: its name (the ABI file's base name, `ERC20`) and the file's parsed JSON, an ABI or an artifact holding one. */
export interface ContractInput {
  readonly contract: string;
  readonly json: unknown;
}

/** What one contract made: the counts the command prints. */
export interface ContractMade {
  readonly contract: string;
  readonly calls: number;
  readonly events: number;
  readonly errors: number;
  /** Whether it had bytecode, so a `deploy` (its stand-in). */
  readonly deployable: boolean;
}

/** What was made: per contract, in the order given, and the files, sorted by path. */
export interface GeneratedAbiAdapter {
  readonly contracts: ReadonlyArray<ContractMade>;
  readonly files: ReadonlyArray<PluginFile>;
}

/** The ABIs can't make an adapter. The message names the contract and the item (`Probe: function send`) and says why, in the words the command prints. */
export class AbiRefused extends Data.TaggedError("AbiRefused")<{ readonly message: string }> {}

export interface AbiAdapterApi {
  /** An adapter's files from its contracts' ABIs: pure, and the same bytes for the same input whatever path it was read from. */
  readonly generate: (input: { readonly name: string; readonly contracts: ReadonlyArray<ContractInput> }) => Effect.Effect<GeneratedAbiAdapter, AbiRefused>;
}
