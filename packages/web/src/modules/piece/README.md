# piece

What every generated piece shares (K29 section 2): the kinds of its options, its state, its api and its parts. A generated primitive is a
`definePrimitive` call that names `piece.options`, `piece.state`, `piece.api` and `piece.slots` (a read: `piece.readOptions`, `readState`, `readApi`,
`readSlots`), so the two things UI SDK does not document live in this module and nowhere else:

- UI SDK's bridge waits while a component's `pending` is true and fails the step with its `error`. A refusal is written to both `refusal` (what a
  page shows) and `error` (`HandleTaken (HN-001): …`, what the agent reads).
- Only a callback sees who pressed (`details.source`), so a send leaves through `dispatch(context, "onSend", …)`, and the host's callback settles it.

A move or a write reads its form (`FormData`: every control with a `name`) and the ids the page gave, and keeps one request key for each open of the
form: kept while the outcome is not known, made anew once it is. A read loads when it appears, when its payload changes and when a write finishes
on one of its things, and keeps only the newest answer. Pending is `aria-busy="true"` and `data-pending` on the root, and only while true.

Framework-free: it imports `@ui-sdk/core`, `orthograph/actions` (through the host's types) and Effect. Test: `piece.test.ts`.
