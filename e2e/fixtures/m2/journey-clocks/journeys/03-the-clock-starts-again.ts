// Journey-author file (m2 check 12, snag #1001). A builder never edits it.
// No starting world, and it runs straight after a journey that stepped a month: its clock starts on the environment's day
// (10 January 2027) all the same, so it may move to 22 January, which a clock shared with that journey could not. The move is
// twelve days, past a session's life, and a signed-in call follows it. It steps 40 days too.
import { Blueprint, expect } from "orthograph";
import show from "../blueprint/things/session/verbs/show.ts";
import today from "../blueprint/things/system/verbs/today.ts";

export default Blueprint.journey("the clock starts again for each journey", {
  cast: { ada: Blueprint.signedIn },
  steps: (s) => [
    // 2027-01-10T09:00:00Z.
    s.step("the server's clock starts on the environment's day", s.ada.run(today, {}), expect((a) => a.clock).toBe(1799571600000n)),
    s.step("the clock moves to 22 January", s.clock.moveTo("2027-01-22T09:00:00Z"), expect((a) => a.now).toBe("2027-01-22T09:00:00.000Z")),
    // 2027-01-22T09:00:00Z.
    s.step("ada is still signed in, and the server reads 22 January", s.ada.run(today, {}), expect((a) => a.clock).toBe(1800608400000n)),
    s.step("forty days pass", s.clock.advance("40 days"), expect((a) => a.now).toBe("2027-03-03T09:00:00.000Z")),
    s.step("ada is still signed in, as herself", s.ada.run(show, {}), expect((a) => a.person).toBe(s.ada.person)),
  ],
});
