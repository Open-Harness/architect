import type { Option, Redacted } from "effect";
import type { Cost } from "../keystore/types.ts";
import type { Keyring } from "../signer/types.ts";

export interface KeyfileOptions {
  /** The folder the files are in: one `<label>.json` for each key, label written as a URI component. */
  readonly directory: string;
  /** What the files are locked with. None: keys can be listed, and nothing opened or added (`KeyLocked`). */
  readonly passphrase: Option.Option<Redacted.Redacted<string>>;
  readonly cost: Cost;
}

export interface KeyfileApi {
  /** A keyring of Web3 Secret Storage v3 files in a folder (K7: the Node signer is an encrypted keystore file). */
  readonly keyring: (options: KeyfileOptions) => Keyring;
}
