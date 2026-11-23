// The control's journey: the same app with no service role and no service journey. A person calls the operation that needs one signed in.
// It passes on today's build, so a red `a service is nobody signed in` is the missing `service` role and not the fixture app.
import { Blueprint, expect, noEvents, spans } from "orthograph";
import who from "../things/probe/verbs/who.ts";

export default Blueprint.journey("a person is signed in", {
  cast: { ada: Blueprint.signedIn },
  steps: (s) => [
    s.step(
      "ada, a person, is let through",
      s.ada.run(who, {}),
      expect((a) => a.status).toBe("ok"),
      noEvents(),
      spans({ present: ["probe.who"] }),
    ),
  ],
});
