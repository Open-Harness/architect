import { Blueprint } from "orthograph";
import { Session } from "../thing.ts";
import { Person } from "../../person/thing.ts";
import { Way } from "../../../values/identity.ts";

export default Blueprint.operation(Session, {
  description: "Who is signed in.",
  payload: {},
  // `via` is how this call got in: the one thing a principal journey can read that no other operation answers (M2.03).
  answer: { person: Person.fields.id, email: Person.fields.email, via: Way },
  allowed: [Blueprint.signedIn],
  budget: { p95: "100 millis" },
});
