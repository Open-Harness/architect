// Journey-author file (m2 check 12, snag #1001). A builder never edits it.
// One journey steps 31 days and its next calls are still allowed, as the same people, by session and by key. Then two steps of
// four days with no call between: eight days after the last sign-in, so the cast must be signed in again after every step,
// not only after a long one. Its clock starts on its starting world's day, the environment's start (10 January 2027).
import { Blueprint, expect } from "orthograph";
import show from "../blueprint/things/session/verbs/show.ts";
import today from "../blueprint/things/system/verbs/today.ts";

export default Blueprint.journey("a month passes and ada is still signed in", {
  cast: { ada: Blueprint.signedIn, cy: Blueprint.signedIn },
  starts: "ada is here",
  steps: (s) => [
    // 2027-01-10T09:00:00Z, in epoch milliseconds.
    s.step("the server's clock starts on the environment's day", s.ada.run(today, {}), expect((a) => a.clock).toBe(1799571600000n)),
    s.step("ada is signed in, as herself", s.ada.run(show, {}), expect((a) => a.person).toBe(s.world.ada)),
    s.step("ada's key is hers", s.ada.via("key").run(show, {}), expect((a) => a.person).toBe(s.world.ada), expect((a) => a.via).toBe("key")),
    s.step("thirty-one days pass", s.clock.advance("31 days"), expect((a) => a.now).toBe("2027-02-10T09:00:00.000Z")),
    s.step("ada is still signed in, as herself", s.ada.run(show, {}), expect((a) => a.person).toBe(s.world.ada), expect((a) => a.via).toBe("session")),
    // 2027-02-10T09:00:00Z.
    s.step("cy is still signed in, and the server reads the day the journey stepped to", s.cy.run(today, {}), expect((a) => a.clock).toBe(1802250000000n)),
    s.step("ada's key is still hers", s.ada.via("key").run(show, {}), expect((a) => a.person).toBe(s.world.ada), expect((a) => a.via).toBe("key")),
    s.step("four days pass", s.clock.advance("4 days"), expect((a) => a.now).toBe("2027-02-14T09:00:00.000Z")),
    s.step("four days more", s.clock.advance("4 days"), expect((a) => a.now).toBe("2027-02-18T09:00:00.000Z")),
    s.step("ada is signed in eight days on, as herself", s.ada.run(show, {}), expect((a) => a.person).toBe(s.world.ada)),
    // 2027-02-18T09:00:00Z.
    s.step("cy is signed in eight days on", s.cy.run(today, {}), expect((a) => a.clock).toBe(1802941200000n)),
  ],
});
