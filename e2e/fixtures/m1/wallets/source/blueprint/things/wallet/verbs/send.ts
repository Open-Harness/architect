import { Blueprint } from "orthograph";
import { Wallet } from "../thing.js";
import { SimulationReverted, KeyLocked, NoSuchKey } from "../errors.js";

export default Blueprint.operation(Wallet, {
  description: "Simulate, sign, send and follow a transfer until it is confirmed.",
  payload: { signer: Blueprint.text({ max: 16 }), label: Blueprint.text({ max: 32 }), to: Blueprint.text({ max: 128 }), value: Blueprint.uint(256) },
  answer: { transaction: Blueprint.text({ max: 128 }), level: Blueprint.text({ max: 16 }), nonce: Blueprint.uint(64) },
  errors: [SimulationReverted, KeyLocked, NoSuchKey],
  allowed: [Blueprint.anyone],
  runs: "client",
});
