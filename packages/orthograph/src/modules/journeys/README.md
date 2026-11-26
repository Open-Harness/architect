# journeys

Owns `Blueprint.journey`, `Blueprint.startingWorld` and the checks a step makes (`expect`, `emits`, `noEvents`,
`refuses`, `spans`, `lacks`, `has`; `machine.isIn` lives with machines). Everything is a plain description: values the
world gives later (`s.world.x`, `s.<name>.person`, `s.<name>.signer`, `s.last.x`) are refs, read by `prove` through
`Scripting.resolve` once the world has said them. `last` is the most recent call's answer, so a step's checks see that
step's own answer.

A step's call is one of four. A cast member calls an operation or a read (`s.ada.run(op, payload)`, a `call`), lists
the MCP door's tools with their own credential (`s.ada.via(Via.agent).tools()`), or signs a message with their own key
for the run (`` s.ada.signs`Claim ${s.world.safe}` ``, a `sign-call`, CX-journey-signs); and the world's clock is moved
(`s.clock.advance("1 month")`, `s.clock.moveTo(instant)`, a `clock-call`). A sign call is a tagged template, a parts
array or one string: its `message` is the parts in order, literal text and refs, joined by `prove` as each part's text.
It answers `{ message, signature, signer }`, and `s.<name>.signer` is the address of that member's key from the
journey's start. A starting world's `makes` may hold the same calls.
Tests: `journeys.test.ts`, `signs.test.ts`.
