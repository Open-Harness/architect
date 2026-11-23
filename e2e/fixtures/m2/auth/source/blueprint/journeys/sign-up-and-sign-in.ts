// Journey-author file. The builder of person.sign-up and session.sign-in never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, expect, noEvents, refuses, spans, type Allowed, type Journey } from "orthograph";
import { PersonEmailTaken } from "../things/person/errors.js";
import { SessionCredentialsWrong } from "../things/session/errors.js";
import signUp from "../things/person/verbs/sign-up.js";
import signIn from "../things/session/verbs/sign-in.js";
import show from "../things/session/verbs/show.js";

// Annotated so its declaration can be written without naming a type the front door does not export.
const journey: Journey<{ readonly newcomer: Allowed; readonly ada: Allowed }> = Blueprint.journey("sign up and sign in", {
  // The newcomer is not signed up by the world: they get a fresh email and password and no token.
  // ada is signed up by the world: the newcomer's own token is not something a step can use, so the last step reads how
  // a signed-in call got in through her (M2-auth, "What each plugin owns": `session.show` answers `via`).
  cast: { newcomer: Blueprint.anyone, ada: Blueprint.signedIn },
  steps: (s) => [
    s.step(
      "before signing up the newcomer is nobody",
      s.newcomer.run(show, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["session.show"] }),
    ),
    s.step(
      "the newcomer signs up",
      s.newcomer.run(signUp, { email: s.newcomer.email, password: s.newcomer.password, name: "Newcomer" }),
      expect((a) => a.person).toMatch(/^per_[0-9a-z]+$/),
      spans({ present: ["person.sign-up", "person.sign-up.create"] }),
    ),
    s.step(
      "signing up again with the same email is refused",
      s.newcomer.run(signUp, { email: s.newcomer.email, password: s.newcomer.password, name: "Newcomer again" }),
      refuses(PersonEmailTaken),
      noEvents(),
      spans({ present: ["person.sign-up"] }),
    ),
    s.step(
      "a wrong password is refused",
      s.newcomer.run(signIn, { email: s.newcomer.email, password: "not-the-password" }),
      refuses(SessionCredentialsWrong),
      noEvents(),
      spans({ present: ["session.sign-in"] }),
    ),
    s.step(
      "the right password answers a session and a token",
      s.newcomer.run(signIn, { email: s.newcomer.email, password: s.newcomer.password }),
      expect((a) => a.session).toMatch(/^ses_[0-9a-z]+$/),
      expect((a) => a.token).toMatch(/^.+$/),
      spans({ present: ["session.sign-in", "session.sign-in.verify"] }),
    ),
    s.step(
      "a signed-in person is told who they are and that they came in by a session",
      s.ada.run(show, {}),
      expect((a) => a.person).toBe(s.ada.person),
      expect((a) => a.email).toBe(s.ada.email),
      expect((a) => a.via).toBe("session"),
      noEvents(),
      spans({ present: ["session.show"] }),
    ),
  ],
});

export default journey;
