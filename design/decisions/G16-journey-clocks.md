# G16-journey-clocks: each journey's own clock, and sessions across a clock step

**Decided 26 November 2026** by Goal 16's checks author for snag #1001, approved by Goal 16's lead (Capxul core) with two
conditions, both taken in below (call 1's either-order check, call 2's line on expiry). Checked by
`e2e/m2/12-journey-clocks.test.ts` and its fixture `e2e/fixtures/m2/journey-clocks`.

## The problem

One `ortho prove` run shares one stepped clock across every journey, and the clock never goes back, so a journey's days depend
on which journeys sort before it. A clock step of more than seven days makes every later call `NotAllowed`, because the cast's
sessions (Better Auth's default life is seven days) expire against the stepped clock. Capxul's 8f checks (#1000) had to pick
journey days inside that limit; payroll (Goal 16 slice 9) and closing a period need a month or more.

## The calls

1. **Each journey starts its clock again.** In a world with a stepped or scaled clock, a journey's clock starts on the
   environment's declared start (`Blueprint.clock.stepped({ starts })`); its starting worlds' own clock steps then move it,
   oldest first, so the journey's first step stands on its starting world's day. The world's warm reset (ST1.24) is already
   the one way the clock goes back; how prove gets there per journey (a reset, a world of its own, or a door that puts the
   clock back) is the builder's. A real clock is never moved. Check 12 pins file order: the same journeys, whose days clash
   under one shared clock, pass with their files in either order.
2. **The cast signs in again after each clock step.** After every clock step, in a starting world or a journey, prove gives
   the journey's cast fresh credentials at the world's new time: the same people (same person id, email and password), new
   sessions, before the journey's next call; and a key the world minted for a way in (`via("key")`) still works after the
   step, minted again or kept. It is done on the step, not on a refusal: prove never retries a refused call. A step's
   `s.<member>.person` and what a starting world gave keep naming the same person. **So a journey never sees a session expire:** expiry is tested only outside journeys,
   at the world's door, by check 12's expiry test and m8 check 02. No step opts out of the sign-in; a journey that needs to
   see a session refused is a new ask, for a later decision.
3. **A session's life stays judged by the world's clock.** The other direction the snag offered (judge a session on real
   time) is not taken: m8 check 02 already holds that Better Auth refuses a session after its life by the world's time, and
   a month-long session would hide a real expiry. Check 12 holds it again on acme: a token cast before a 31-day step is
   refused after it, and the same name cast again is the same person, signed in.

## Why

Call 3 keeps one meaning for time inside a world: everything, sessions included, reads the world's instant (K23). Calls 1
and 2 then follow from the snag's ask: a journey's days are its own, and a long step is no refusal.
