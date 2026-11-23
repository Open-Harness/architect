# world-clock

A journey's clock steps (K23 section 2, M8.07). `s.clock.advance(span)` and `s.clock.moveTo(instant)` are steps like a
call: `WorldClock.move(url, move)` asks the world's own door (`POST /_world/clock/advance` or `/move-to`), which fires
what is due on the way, waits until the world is quiet at the target, and answers `{ now, fired }`. That answer is the
step's answer, so `expect((a) => a.now)` reads it, and `s.clock.now` is the instant it ended at. A refusal is the
world's own: 409 `ClockNotMovable` on a real clock, 409 `NeverQuiet` naming who is busy. A step the world refused fails
unless it asks for a refusal. `WorldClock.read(url)` is `GET /_world/clock`, for `s.clock.now` at the start of a journey;
a world with no clock door (a deployed environment closes `/_world`) answers nothing, and `s.clock.now` is then missing.

The journeys module calls it; nothing else does. The world's door and its settling are `host-cloudflare`'s.
