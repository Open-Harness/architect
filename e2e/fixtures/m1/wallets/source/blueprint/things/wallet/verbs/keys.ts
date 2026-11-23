import { Blueprint } from "orthograph";
import { Wallet } from "../thing.js";
import { KeyLocked } from "../errors.js";

export default Blueprint.operation(Wallet, {
  description: "List the accounts of the keys this signer keeps.",
  payload: { signer: Blueprint.text({ max: 16 }) },
  answer: { count: Blueprint.uint(32), accounts: Blueprint.text({ max: 2048 }) },
  errors: [KeyLocked],
  allowed: [Blueprint.anyone],
  runs: "client",
});
