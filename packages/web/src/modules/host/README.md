# host

`WebHost.make({ client, ask })`: what a page gives every generated piece (K29 section 2, `design/decisions/WEB-host-seam.md`).

- `client` is the generated SDK's layer, the person's credential in it (`PluggedIn.layer({ url, credential })`). The host has no session of its
  own. Each call builds the layer, runs the SDK's call through `runForAction` (a declared refusal is the typed `ActionRefusal`, anything else a
  redacted error), and sends the request key (`idempotency-key`) and who pressed (`x-ortho-source`, `person` or `agent`) on its own fetch.
- `ask` is `orthograph/actions`' approver. It is called only by the wrapper `host.action(options)` returns, when a write that `needsApproval` runs
  with no yes given. A piece's press is a yes (a person pressed the confirming control, or UI SDK's bridge asked one), so a piece never asks.
- `host.wire(options)` is what a piece's root takes: `{ host, onSend }`. `onSend` decodes the form's payload by the action's own schema (a payload
  the schema refuses is `InvalidPayload` and nothing is sent), runs the action as the caller, and settles the piece with an `Outcome`.
- A write that finishes tells the reads that show its thing (`onFinished`); a refused or failed one tells no one.
- `WebHost.missing` is what a piece outside the provider finds: every press is refused, saying so.

Pure of React: the one framework file is generated (`generated/web/react.tsx`). Test: `host.test.ts`.
