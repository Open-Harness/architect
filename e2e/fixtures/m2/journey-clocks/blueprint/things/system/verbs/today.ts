import { Blueprint } from "orthograph";
import { System } from "../thing.ts";
import { Millis } from "../../../values/clock.ts";

export default Blueprint.operation(System, {
  description: "What the server's clock reads now, for someone signed in.",
  payload: {},
  answer: { clock: Millis },
  allowed: [Blueprint.signedIn],
  budget: { p95: "50 millis" },
});
