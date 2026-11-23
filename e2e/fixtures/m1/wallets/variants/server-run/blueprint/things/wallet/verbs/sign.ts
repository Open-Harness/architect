import { Blueprint } from "orthograph";
import { Wallet } from "../thing.js";
import { KeyLocked, NoSuchKey } from "../errors.js";

export default Blueprint.operation(Wallet, {
  description: "Sign a message (EIP-191) with the key of this label.",
  payload: { signer: Blueprint.text({ max: 16 }), label: Blueprint.text({ max: 32 }), message: Blueprint.text({ max: 256 }) },
  answer: { signature: Blueprint.text({ max: 256 }) },
  errors: [KeyLocked, NoSuchKey],
  allowed: [Blueprint.anyone],
});
