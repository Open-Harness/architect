import { Blueprint } from "orthograph";
import { Session } from "../thing.js";
import { SessionCredentialsWrong } from "../errors.js";
import { Person } from "../../person/thing.js";
import { Password, Secret } from "../../../values/identity.js";

export default Blueprint.operation(Session, {
  description: "Sign in with email and password. The token is the bearer for every later call.",
  payload: { email: Person.fields.email, password: Password },
  // The caller is handed both once, in this answer: `issued` lets a secret leave there and nowhere else.
  answer: { session: Blueprint.issued(Blueprint.visibility.secret(Session.fields.id)), token: Blueprint.issued(Secret) },
  errors: [SessionCredentialsWrong],
  allowed: [Blueprint.anyone],
  steps: { verify: Blueprint.step.database() },
  budget: { p95: "400 millis" },
});
