import { Blueprint } from "orthograph";
import { Probe } from "../thing.ts";
import { ledgerer } from "../roles.ts";
import { Ok } from "../../../values/ok.ts";

export default Blueprint.operation(Probe, {
  description: "Answers for the ledger service, and for no one else.",
  payload: {},
  answer: { status: Ok },
  allowed: [ledgerer],
  budget: { p95: "50 millis" },
});
