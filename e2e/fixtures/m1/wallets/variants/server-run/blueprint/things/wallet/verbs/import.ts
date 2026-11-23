import { Blueprint } from "orthograph";
import { Wallet } from "../thing.js";
import { KeyLocked } from "../errors.js";

export default Blueprint.operation(Wallet, {
  description: "Bring a key onto the signer, and answer its account.",
  payload: { signer: Blueprint.text({ max: 16 }), label: Blueprint.text({ max: 32 }), source: Blueprint.text({ max: 256 }) },
  answer: { wallet: Wallet.fields.id, account: Blueprint.text({ max: 128 }) },
  errors: [KeyLocked],
  allowed: [Blueprint.anyone],
});
