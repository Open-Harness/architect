import { Blueprint } from "orthograph";
import { Probe } from "../thing.ts";
import { Ok } from "../../../values/ok.ts";

export default Blueprint.operation(Probe, {
  description: "Answers for the runtime's own work, and for no one else.",
  payload: {},
  answer: { status: Ok },
  allowed: [Blueprint.system],
  budget: { p95: "50 millis" },
});
