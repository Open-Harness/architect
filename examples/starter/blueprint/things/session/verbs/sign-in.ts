import { Blueprint } from "orthograph";
import { Session } from "../thing.ts";
import { SessionCredentialsWrong } from "../errors.ts";
import { Person } from "../../person/thing.ts";
import { Password, Secret } from "../../../values/identity.ts";

export default Blueprint.operation(Session, {
  description: "Sign in with email and password. The token is the bearer for every later call.",
  payload: { email: Person.fields.email, password: Password },
  answer: { session: Blueprint.issued(Blueprint.visibility.secret(Session.fields.id)), token: Blueprint.issued(Secret) },
  errors: [SessionCredentialsWrong],
  allowed: [Blueprint.anyone],
  steps: { verify: Blueprint.step.database() },
  budget: { p95: "400 millis" },
});
