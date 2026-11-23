import { Blueprint } from "orthograph";
import { Wallet } from "../thing.js";
import { KeyLocked } from "../errors.js";

export default Blueprint.operation(Wallet, {
  description: "Bring a key onto the signer, and answer its account. `source` is a secret key (node, keystore, world) or the account the browser's provider holds.",
  payload: {
    signer: Blueprint.traced(Blueprint.text({ max: 16 })),
    label: Blueprint.traced(Blueprint.text({ max: 32 })),
    // A secret key travels through here: it is recorded nowhere, not in a span, a log or a journal.
    source: Blueprint.visibility.secret(Blueprint.text({ max: 256 })),
  },
  answer: { wallet: Wallet.fields.id, account: Blueprint.text({ max: 128 }) },
  errors: [KeyLocked],
  allowed: [Blueprint.anyone],
  runs: "client",
});
