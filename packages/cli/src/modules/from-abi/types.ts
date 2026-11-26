// `ortho new adapter <name> --from-abi <file> [--from-abi <file> ...]` (unit A1, #1164): an adapter generated from contracts' ABIs.
import { Data, type Effect } from "effect";

/** Nothing was written: the message says what is wrong with the name, a file, or where the adapter was to be written. */
export class FromAbiRefused extends Data.TaggedError("FromAbiRefused")<{ readonly message: string }> {}

export interface FromAbiApi {
  /**
   * Reads each ABI file (an ABI, or an artifact holding one; the contract is the file's base name), makes the adapter and
   * writes it to `<root>/plugins/<name>/`: every generated file put back, a scaffold only where there is none. Nothing is
   * written unless the whole adapter could be made. The last line says what was made.
   */
  readonly adapter: (input: { readonly root: string; readonly name: string; readonly from: ReadonlyArray<string> }) => Effect.Effect<ReadonlyArray<string>, FromAbiRefused>;
}
