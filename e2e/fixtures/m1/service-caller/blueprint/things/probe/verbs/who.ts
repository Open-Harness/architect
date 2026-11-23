import { Blueprint } from "orthograph";
import { Probe } from "../thing.ts";
import { Ok } from "../../../values/ok.ts";

export default Blueprint.operation(Probe, {
  description: "Answers for a person who is signed in, and for no one else.",
  payload: {},
  answer: { status: Ok },
  allowed: [Blueprint.signedIn],
  budget: { p95: "50 millis" },
});
