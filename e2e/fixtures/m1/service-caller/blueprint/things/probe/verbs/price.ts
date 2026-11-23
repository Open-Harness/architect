import { Blueprint } from "orthograph";
import { Probe } from "../thing.ts";
import { pricer } from "../roles.ts";
import { Ok } from "../../../values/ok.ts";

export default Blueprint.operation(Probe, {
  description: "Answers for the pricing service, and for no one else.",
  payload: {},
  answer: { status: Ok },
  allowed: [pricer],
  budget: { p95: "50 millis" },
});
