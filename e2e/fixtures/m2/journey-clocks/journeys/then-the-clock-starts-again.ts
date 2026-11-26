// Journey-author file (m2 check 10, snag #1001). A builder never edits it.
// No starting world: its clock starts on the environment's day (10 January 2027), though it runs after the two journeys that
// step a month, so it may move to 12 January, which a clock shared with them could not. It steps 40 days too, so no order
// of the three fits one shared clock.
import { Blueprint, expect } from "orthograph";
import show from "../blueprint/things/session/verbs/show.ts";
import today from "../blueprint/things/system/verbs/today.ts";

export default Blueprint.journey("the clock starts again for each journey", {
  cast: { ada: Blueprint.signedIn },
  steps: (s) => [
    // 2027-01-10T09:00:00Z.
    s.step("the server's clock starts on the environment's day", s.ada.run(today, {}), expect((a) => a.clock).toBe(1799571600000n)),
    s.step("the clock moves to 12 January", s.clock.moveTo("2027-01-12T09:00:00Z"), expect((a) => a.now).toBe("2027-01-12T09:00:00.000Z")),
    // 2027-01-12T09:00:00Z.
    s.step("the server reads 12 January", s.ada.run(today, {}), expect((a) => a.clock).toBe(1799744400000n)),
    s.step("forty days pass", s.clock.advance("40 days"), expect((a) => a.now).toBe("2027-02-21T09:00:00.000Z")),
    s.step("ada is still signed in, as herself", s.ada.run(show, {}), expect((a) => a.person).toBe(s.ada.person)),
  ],
});
