// Journey-author file (m2 check 12, snag #1001). A builder never edits it.
// No starting world, and it leaves the clock only three days on: the journey after it still starts on 10 January.
import { Blueprint, expect } from "orthograph";
import today from "../blueprint/things/system/verbs/today.ts";

export default Blueprint.journey("a few days pass", {
  cast: { ada: Blueprint.signedIn },
  steps: (s) => [
    // 2027-01-10T09:00:00Z, in epoch milliseconds.
    s.step("the server's clock starts on the environment's day", s.ada.run(today, {}), expect((a) => a.clock).toBe(1799571600000n)),
    s.step("the clock moves to 13 January", s.clock.moveTo("2027-01-13T09:00:00Z"), expect((a) => a.now).toBe("2027-01-13T09:00:00.000Z")),
    // 2027-01-13T09:00:00Z.
    s.step("the server reads 13 January", s.ada.run(today, {}), expect((a) => a.clock).toBe(1799830800000n)),
  ],
});
