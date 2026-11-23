import { Blueprint } from "orthograph";
import { Wallet } from "../thing.js";
import { KeyLocked } from "../errors.js";

export default Blueprint.operation(Wallet, {
  description: "Make a key where the signer keeps it, and answer its account.",
  payload: { signer: Blueprint.traced(Blueprint.text({ max: 16 })), label: Blueprint.traced(Blueprint.text({ max: 32 })) },
  answer: { wallet: Wallet.fields.id, account: Blueprint.text({ max: 128 }) },
  errors: [KeyLocked],
  allowed: [Blueprint.anyone],
  runs: "client",
});
