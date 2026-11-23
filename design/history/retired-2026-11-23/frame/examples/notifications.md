# Example: email when something happens

Part of the frame's worked examples ([`../README.md`](../README.md)). Proposed, 17 November 2026. Language: Effect only.
"Language" is the axis that was called "target" before (Effect, Solidity, Noir, Python); it is not a host or a
projection.

## The idea

When an owner invites someone, the invitee gets an email with a link. When a payment is refunded
([`payments.md`](payments.md)), the owner gets a receipt. Nobody calls "send an email": the email follows from an
event that already happened. If the email service is down, the invitation still exists, and the email goes out later.
If delivery is retried, the person still gets one email.

This example is about one thing the frame has not yet shown: **our own events driving our own operations**, the way
an adapter's event drives `payment.settle`.

## The description

The email adapter. Resend is the provider, reached over SMTP, which Resend offers beside its HTTP API. That choice is
what lets a real local mail server stand in (below).

```ts
// blueprint/adapters/email.ts: the mount is called `email`
import { Blueprint } from "orthograph";
import resend from "@orthograph/resend";

export default Blueprint.use(resend, (r) => [r.include(r.calls.send), r.choose(r.choices.transport.smtp)]);
```

A notification is a thing, so that "was this sent?" has an answer and a second delivery has something to find:

```ts
// blueprint/things/notification/thing.ts: lives in the database, keyed by the event that caused it
export const Notification = Blueprint.thing({
  description: "An email acme sent, and the event that caused it.",
  fields: { id: Blueprint.id("ntf"), cause: Blueprint.eventId(), to: Email, template: Template },
});
```

Each email is an operation that takes one of our events, through the same `on:` an adapter's event uses:

```ts
// blueprint/things/notification/verbs/invite.ts
import email from "../../../adapters/email.ts";
import { InvitationSent } from "../../invitation/events.ts";

export default Blueprint.operation(Notification, {
  payload: { invitation: Invitation.fields.id, to: Email, cause: Blueprint.eventId() },
  answer: { notification: Notification.fields.id },
  allowed: [Blueprint.system],                                  // only the system delivers our own events
  on: [Blueprint.on(InvitationSent, (e, meta) => ({ invitation: e.invitation, to: e.email, cause: meta.id }))],
  steps: { send: Blueprint.step.call(email.calls.send), insert: Blueprint.step.database() },
  idempotent: { by: ["cause"] },                                // one email per event, however often it is delivered
  budget: { p95: "2 seconds" },
});
```

`notification.receipt` is the same shape, `on: [Blueprint.on(PaymentRefunded, …)]`.

## How the event gets there: the outbox

This is the part that needs designing, because today's outbox exists only inside actors, for keeping the
organisation's index up to date (`host-cloudflare` `actors`, build plan I2: "an outbox for thing-to-index delivery
retried by alarm").

The proposal makes it general:

1. A move writes its event and an outbox row **in the same write** as the state change. For a database thing that is one
   D1 batch; for an actor it is the actor's own storage. A move that fails leaves no event and nothing in the outbox.
2. The outbox is drained by an alarm. Each row is delivered to every operation whose `on:` takes that event, as the
   `system` principal, with the event's id.
3. Delivery is at least once. A failed delivery is retried with backoff (a `Schedule` through `Timers`, never a raw
   sleep). After the budget of retries it becomes a defect, visible in `watch`.
4. The receiving operation is idempotent by the event's id, so at-least-once becomes exactly one email.

Why not a workflow for this? A workflow is for something with several steps and waits that must survive a crash
(an agent's run, "remind them in three days if they haven't accepted"). One event to one call is an outbox delivery.
The reminder is a workflow, and it waits for layer 5's time.

## Journeys

In prose:

1. Ada invites olga@example.test. Olga's inbox has one email, whose link carries the invitation's id.
2. The email service fails the first time. The invitation is still sent. When it recovers, olga gets one email.
3. The same `InvitationSent` is delivered twice. Olga still has one email, and there is one notification.
4. Bob calls `notification.invite` himself. He is refused: only the system may.

Executable. The world gives journeys a new check, `inbox`, which reads the stand-in mail server's own API:

```ts
// journeys/invite-sends-one-email.ts
export default Blueprint.journey("invite sends one email", {
  cast: { ada: owner, bob: Blueprint.signedIn },
  starts: "founded",
  steps: (s) => [
    s.step("ada invites olga", s.ada.run(send, { organization: s.world.organization, email: "olga@example.test" }),
      emits(InvitationSent), s.world.settles(),               // waits until the outbox is quiet
      inbox("olga@example.test", { count: 1, subject: /invited to/, links: [s.last.invitation] })),
    s.step("the event is delivered again", s.world.redeliver(InvitationSent),
      inbox("olga@example.test", { count: 1 }), noEvents()),
    s.step("bob can't send it himself", s.bob.run(invite, { invitation: s.world.invitation, to: "x@example.test", cause: "evt_1" }),
      refuses(Blueprint.NotAllowed)),
  ],
});
```

`s.world.settles()` is "wait until quiet", which the world already has for time and alarms (build plan L1.15); the
outbox is one more thing it counts.

## Blanks and handlers

One blank per notification: turning the event into an email. The handler renders the template and calls the step.

```ts
// src/notification/invite.ts
const invite: Handler = ({ invitation, to }, { steps }) =>
  Effect.gen(function* () {
    const body = yield* Templates.invitation({ invitation, link: Links.accept(invitation) });
    yield* steps.send({ to, subject: "You're invited to acme", html: body });
    return { notification: (yield* steps.insert({ to, template: "invitation" })).id };
  });
```

The template is plain code in `src/`. Its words are not in the description; that the email links to the invitation is,
and the journey checks it.

## Adapters and secrets

| | |
|---|---|
| Calls out | `send` only, over SMTP |
| Events in | none here (delivery receipts from Resend would be a later `on:`) |
| Secrets | `EMAIL_SMTP_PASSWORD`, runtime; locally the stand-in accepts any value |
| Stand-in | `Stand.process(mailpit)`: Mailpit, a real SMTP server with an HTTP API to read what arrived |

Mailpit is the cleanest rung of the stand-in ladder: real software speaking the real protocol. Nothing is faked, and
the inbox a journey reads is a real inbox. The conformance test sends one email through Resend's SMTP in staging and
checks it was accepted.

## Where data lives

`Notification` lives in the database: it is listed ("what did we send this organisation?") and never races. The
outbox lives with whatever emitted the event. Nothing new lives in an actor.

## Projections and what gets generated

- **server**: the two operations, plus the outbox drain: one alarm per place that can emit.
- **sdk, cli, mcp**: nothing. Both operations admit only `system`, so the default `takes` rule leaves them out.
- **docs and portal**: each event shows what it causes ("`InvitationSent` → email to the invitee"), read from `on:`.
- **builder**: the brief for `notification.invite` includes the event's fields and the template's inputs.

## Proof

`ortho prove` shows the new operations as any other, with the stand-in named:

```text
adapters   email → mailpit (process)
notification.invite   9 evals ✔ (delivered by system, from InvitationSent)
```

The `who may call` eval checks that every call came from `system`. The `events` eval checks that one event made one
notification, which is the idempotency proof.

## Today vs proposed

| | Today (`origin/layer/3`) | Proposed |
|---|---|---|
| Our events causing calls | none; events are evidence only (`examples/acme/blueprint/things/invitation/events.ts:5`) | `on:` takes our own events as well as an adapter's |
| Outbox | inside actors only, for the index (build plan I2, L1.20) | every move writes its events to an outbox, drained by alarm |
| `system` principal | not in `Principal` (`packages/orthograph/src/modules/roles/types.ts:6-8`) | added; the keeper and the outbox call as it |
| Idempotency | `idempotent: "request"` (`allowance/verbs/spend.ts:16`) | also `idempotent: { by: [<payload key>] }` (K21), and `unchanged` on a move |
| Reading an inbox in a journey | no | `inbox(...)`, through Mailpit's API |

## Questions this raised

1. **Our events driving our operations: `on:` or a separate reaction?** (a) The same `on:` as adapter events, called
   as `system`. (b) A new `Blueprint.reaction(event, handler)` with no operation. *Recommend (a)*: one mechanism, and
   the reaction gets roles, evals and docs for free.
2. **Email over SMTP or over the provider's HTTP API?** (a) SMTP, so Mailpit stands in as real software. (b) HTTP,
   with the vendor's sandbox in staging and `Stand.none` locally. *Recommend (a)*; only providers without SMTP use (b).
3. **When an event can't be delivered after its retries?** (a) A defect, shown by `watch`, the row kept for a manual
   redelivery command. (b) A dead-letter thing the app declares. *Recommend (a)* now; (b) once a real app needs to act
   on failures.
