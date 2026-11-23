// Journey-author file (M2.02, the principal part; M2.03 builds it). The builder of session.show and of the principals never edits it
// (AGENTS.md, "Journeys and checks come first"). It is acme's copy: the auth plugin has the same journey, and M2.25 deletes this one.
//
// Ada holds a session token here, which is why the `via` assertions live in this journey and not in `sign up and sign in`: prove
// can't carry an `anyone` newcomer's own token. `s.ada.via(Via.key)` is the credential the world mints for Ada as a person's key,
// and `Via.agent` the one it mints as an agent key for her: three ways in, one person (`M2-auth.md`, fork 2).
import { Blueprint, Via, expect, noEvents, spans } from "orthograph";
import show from "../blueprint/things/session/verbs/show.ts";

export default Blueprint.journey("a key and a session are the same person", {
  cast: { ada: Blueprint.signedIn },
  steps: (s) => [
    s.step(
      "ada's session says who she is and how she got in",
      s.ada.run(show, {}),
      expect((a) => a.person).toBe(s.ada.person),
      expect((a) => a.email).toBe(s.ada.email),
      expect((a) => a.via).toBe("session"),
      noEvents(),
      spans({ present: ["session.show"] }),
    ),
    s.step(
      "ada's key says the same person, and that it is a key",
      s.ada.via(Via.key).run(show, {}),
      expect((a) => a.person).toBe(s.ada.person),
      expect((a) => a.email).toBe(s.ada.email),
      expect((a) => a.via).toBe("key"),
      noEvents(),
      spans({ present: ["session.show"] }),
    ),
    s.step(
      "an agent key made for ada says the same person, and that it is an agent",
      s.ada.via(Via.agent).run(show, {}),
      expect((a) => a.person).toBe(s.ada.person),
      expect((a) => a.email).toBe(s.ada.email),
      expect((a) => a.via).toBe("agent"),
      noEvents(),
      spans({ present: ["session.show"] }),
    ),
  ],
});
