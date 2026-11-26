// Journey-author file (m2 check 12, snag #1001). A builder never edits it.
// Its starting world steps a month: its clock starts on that world's day (10 February 2027), not on the day an earlier
// journey left the world at. After 31 days more Ada still owns what she founded before the step: the same person, not a new one.
import { Blueprint, expect } from "orthograph";
import grant from "../blueprint/things/allowance/verbs/grant.ts";
import show from "../blueprint/things/session/verbs/show.ts";
import today from "../blueprint/things/system/verbs/today.ts";

export default Blueprint.journey("a journey starts on its starting world's day", {
  cast: { ada: Blueprint.signedIn },
  starts: "a month on",
  steps: (s) => [
    // 2027-02-10T09:00:00Z: the environment's start and the starting world's month.
    s.step("the server's clock starts on the starting world's day", s.ada.run(today, {}), expect((a) => a.clock).toBe(1802250000000n)),
    // February 2027 has 28 days: 10 February and 31 days is 13 March.
    s.step("thirty-one days pass", s.clock.advance("31 days"), expect((a) => a.now).toBe("2027-03-13T09:00:00.000Z")),
    s.step("ada is still signed in, as herself", s.ada.run(show, {}), expect((a) => a.person).toBe(s.world.ada)),
    s.step("ada still owns the organisation she founded before the step", s.ada.run(grant, { organization: s.world.organization, member: s.world.bo, limit: 500n }), expect((a) => a.allowance).toMatch(/^alw_[0-9a-z]+$/)),
    // 2027-03-13T09:00:00Z.
    s.step("the server reads the day the journey stepped to", s.ada.run(today, {}), expect((a) => a.clock).toBe(1804928400000n)),
  ],
});
