import { join } from "node:path";
import { Config } from "effect";

/** Where the `node` signer's keystore is and what locks it: `ORTHO_WALLET_HOME` (default `~/.orthograph/wallets`) and `ORTHO_WALLET_PASSPHRASE`. */
export const nodeSettings = Config.all({
  home: Config.String("ORTHO_WALLET_HOME").pipe(Config.withDefault("")),
  user: Config.String("HOME").pipe(Config.withDefault("")),
  passphrase: Config.option(Config.Redacted("ORTHO_WALLET_PASSPHRASE")),
});

export const directoryOf = (home: string, user: string) => (home !== "" ? home : join(user === "" ? "." : user, ".orthograph", "wallets"));
