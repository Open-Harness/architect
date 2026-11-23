import { Blueprint } from "orthograph";
import { Session } from "../thing.js";
import { Person } from "../../person/thing.js";
import { Way } from "../../../values/identity.js";

export default Blueprint.operation(Session, {
  description: "Who is signed in, and how this call got in.",
  payload: {},
  // `via` is new in M2 (M2-auth, "What each plugin owns"): the one observable of the new principals that needs no new operation.
  answer: { person: Person.fields.id, email: Person.fields.email, via: Way },
  allowed: [Blueprint.signedIn],
  budget: { p95: "100 millis" },
});
