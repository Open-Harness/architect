# WEB-host-seam: the browser host is `WebHost.make({ client, ask })`, and the session is the client's credential

Decided 23 November 2026 by Goal 5's lead, for slice 2 (ST1.26, the web projection's checks, #599) and slice 4 (ST1.25,
the builder).

## The problem

K29 section 4 (`K29-ui-layer.md`, the entry sketch) writes the host as
`WebHost.make({ client: PluggedIn.layer({ baseUrl: location.origin }), session: WebHost.session.cookie })` and asks a
person through a `host.ask(step.confirm, { signal })` method. The checks need one constructor to mount the pieces with
(`e2e/ui-layer/page/boot.tsx`), and the builder reads K29. Two things in that sketch don't match the code that exists:
the generated client takes `{ url, credential? }`, not `{ baseUrl }`
(`examples/plugged-in/generated/sdk/src/client.ts:82`, `Options`), and the credential is already how a client says who
is calling, so a `session` beside it would say it twice. And slice 1 fixed what a person is asked and how
(`Approver`, `e2e/ui-layer/contract.ts:45`).

## The call

1. The host is `WebHost.make({ client, ask })`.
2. `client` is the generated client's layer, `PluggedIn.layer({ url, credential? })`. The session is the client's
   credential (`PluggedIn.Credential.session(token)`, or none for a visitor); the host has no `session` of its own.
3. `ask` is slice 1's approver, `(request: ApprovalRequest) => Promise<boolean>`. The host calls it when a write that
   needs a person's yes runs and no agent has asked already: an agent's press on a control marked
   `data-agent-confirm` is asked by UI SDK's bridge and never again by the host. A person's own press on the confirming
   control is the yes, so nobody is asked. A no is `AR-007`, `ApprovalDeclined` (WEB-approval-declined).
4. The checks mount pieces only through this constructor, `PluggedInHost` and `usePieceHost` of
   `generated/web/react.tsx`. A builder who spells it differently asks the checks author, who changes the one line in
   `page/boot.tsx`.

`WebHost.session.cookie` and `{ baseUrl }` are not part of the host. A page served by the Worker that signs in by cookie
passes `PluggedIn.layer({ url: location.origin })`: the browser sends the cookie with each request, so the client needs
no credential of its own.

## Supersedes

- K29-ui-layer.md: "WebHost.make({ client: PluggedIn.layer({ baseUrl: location.origin }), session: WebHost.session.cookie })" → "WebHost.make({ client: PluggedIn.layer({ url: location.origin }), ask })"
- K29-ui-layer.md: "host.ask(step.confirm, { signal })" → "host.ask({ action, description, args })"
