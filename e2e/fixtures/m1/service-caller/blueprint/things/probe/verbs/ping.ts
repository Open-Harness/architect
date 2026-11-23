import { Blueprint } from "orthograph";
import { Probe } from "../thing.ts";
import { Ok } from "../../../values/ok.ts";

export default Blueprint.operation(Probe, {
  description: "Answers for anyone: every kind of caller.",
  payload: {},
  answer: { status: Ok },
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
