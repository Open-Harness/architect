# Example: taking payments and refunds with Stripe

Part of the frame's worked examples ([`../README.md`](../README.md)). Proposed, 17 November 2026. It uses the Stripe
adapter from [`../adapters.md`](../adapters.md) and the secrets from [`../secrets.md`](../secrets.md); this page shows
them working together in one app, acme. Package names under `@orthograph/*` follow the layout still open in
[`../delta.md`](../delta.md); `orthograph` is the front door, the `Blueprint` API (`decisions/M0-packages.md`). Language: Effect only.
"Language" is the axis that was called "target" before (Effect, Solidity, Noir, Python); it is not a host or a
projection.

## The idea

An organisation's owner pays acme by card. Stripe hosts the checkout page. When Stripe says the checkout completed,
acme marks the payment settled. Later the owner can refund part or all of it. Nobody types a card number into acme, and
acme never holds one.

Three crossings of the boundary: a call out (create a checkout session), an event in (the checkout completed), and a
call out again (the refund). One adapter mount carries all three.

## The description

```ts
// blueprint/adapters/stripe.ts: the mount is called `stripe`, after its file
import { Blueprint } from "orthograph";
import stripe from "@orthograph/stripe";

export default Blueprint.use(stripe, (s) => [
  s.include(s.calls.checkout.sessions.create),
  s.include(s.calls.refunds.create),
  s.include(s.events.checkoutCompleted),
]);
```

```ts
// blueprint/things/payment/thing.ts and machine.ts: lives in the database, the default
export const Payment = Blueprint.thing({
  description: "Money an organisation paid acme, through Stripe.",
  fields: { id: Blueprint.id("pay"), organization: Organization.fields.id, amount: Amount, refunded: Amount,
            checkout: StripeCheckoutId, intent: Blueprint.optional(StripePaymentIntentId) },
});

export const machine = Blueprint.machine(Payment, {
  states: ["pending", "settled", "refunded"],
  moves: {
    start:  { from: [], to: "pending", emits: Events.PaymentStarted },
    settle: { from: ["pending"], to: "settled", emits: Events.PaymentSettled },
    refund: { from: ["settled"], to: ["settled", "refunded"], emits: Events.PaymentRefunded }, // part or all
  },
});
```

```ts
// blueprint/things/payment/verbs/start.ts
export default Blueprint.operation(Payment, {
  payload: { organization: Payment.fields.organization, amount: Amount },
  answer: { payment: Payment.fields.id, url: Url },
  move: machine.moves.start,
  allowed: [owner.of("organization")],
  steps: { checkout: Blueprint.step.call(stripe.calls.checkout.sessions.create), insert: Blueprint.step.database() },
});

// blueprint/things/payment/verbs/settle.ts: only Stripe may call it, through its door
export default Blueprint.operation(Payment, {
  payload: { checkout: Payment.fields.checkout, intent: StripePaymentIntentId },
  move: machine.moves.settle,
  allowed: [processor],                      // Blueprint.role(Payment, { service: stripe })
  on: [Blueprint.on(stripe.events.checkoutCompleted, (e) => ({ checkout: e.data.object.id, intent: e.data.object.payment_intent }))],
  idempotent: "request",                     // keyed by Stripe's event id at the door
});

// blueprint/things/payment/verbs/refund.ts: a person may refund; an agent may not
export default Blueprint.operation(Payment, {
  payload: { payment: Payment.fields.id, amount: Amount },
  answer: { refunded: Amount },
  move: machine.moves.refund,
  errors: [RefundTooLarge],
  allowed: [owner.of("organization").notVia(Via.agent)],
  steps: { refund: Blueprint.step.call(stripe.calls.refunds.create), update: Blueprint.step.database() },
  idempotent: "request",
});
```

`.notVia(Via.agent)` is a design call made in the description: money going back out needs a person. The MCP
projection's default `takes` rule then leaves `payment.refund` out of the MCP catalogue without anyone saying so.

## Journeys

In prose first, the way a journey author writes them before any code:

1. Ada starts a payment of 20 dollars and gets a checkout link. The payment is pending.
2. Stripe says the checkout completed. The payment is settled. The call came from `service(stripe)`.
3. Stripe says it again, with the same event id. Nothing changes and no second event is emitted.
4. Bob, an outsider, calls `payment.settle` himself. He is refused, and the handler never runs.
5. Ada refunds 5. The payment stays settled, with 5 refunded. Ada refunds 15 more. It is refunded.
6. Ada asks for 1 more. She is refused with `RefundTooLarge`, and Stripe is never called.

Then executable, with a new kind of step: `s.stripe.sends(...)` delivers a signed event to the world's door for that
adapter, as Stripe would. The world signs it with the webhook secret it generated for itself.

```ts
// journeys/pay-then-refund.ts: written by the journey author, never by the builder
export default Blueprint.journey("pay then refund", {
  cast: { ada: owner, bob: Blueprint.signedIn },
  starts: "founded",
  steps: (s) => [
    s.step("ada starts a payment", s.ada.run(start, { organization: s.world.organization, amount: 2000n }),
      machine.isIn(s.last.payment, "pending"), spans({ present: ["payment.start.checkout"] })),
    s.step("stripe says it completed", s.stripe.sends(stripe.events.checkoutCompleted, { checkout: s.last.checkout }),
      emits(PaymentSettled), calledBy(Blueprint.service(stripe))),
    s.step("stripe says it again", s.stripe.sends(stripe.events.checkoutCompleted, { checkout: s.last.checkout, sameId: true }),
      noEvents()),
    s.step("bob can't settle it", s.bob.run(settle, { checkout: s.world.checkout, intent: "pi_x" }),
      refuses(Blueprint.NotAllowed), spans({ absent: ["payment.settle"] })),
    s.step("ada refunds too much", s.ada.run(refund, { payment: s.world.payment, amount: 2001n }),
      refuses(RefundTooLarge), spans({ absent: ["payment.refund.refund"] })),
  ],
});
```

## Blanks and handlers

Three handlers. `settle` is almost nothing: the machine and the door did the work. The real blank is the refund's error
mapping, the "one blank an adapter call leaves" from [`../adapters.md`](../adapters.md):

```ts
// src/payment/refund.ts: scaffolded once, yours from then on
const refund: Handler = ({ payment, amount }, { steps, thing }) =>
  Effect.gen(function* () {
    if (amount > thing.amount - thing.refunded) return yield* new RefundTooLarge({ left: thing.amount - thing.refunded });
    const r = yield* steps.refund({ payment_intent: thing.intent, amount }).pipe(Effect.either);
    if (r._tag === "Left" && r.left._tag === "StripeInvalidRequest") return yield* new RefundTooLarge({ left: 0n });
    if (r._tag === "Left") return yield* Effect.die(r.left);   // unmapped: a defect, and the eval says so
    yield* steps.update({ refunded: thing.refunded + amount });
    return { refunded: thing.refunded + amount };
  });
```

Checking the amount before calling Stripe is what the journey's last step proves: the refund span is absent.

## Adapters and secrets

| | |
|---|---|
| Calls out | `checkout.sessions.create`, `refunds.create`, typed from Stripe's OpenAPI document |
| Events in | `checkoutCompleted`, verified by Stripe's signature scheme at the door, decoded by Stripe's schema |
| Principal | `service(stripe)`, admitted only by the `processor` role |
| Secrets | `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SIGNING`, runtime, declared by the adapter, read only by its layer |
| Release secret | a restricted Stripe key in CI, for registering the webhook (below) |
| Stand-in | `Stand.vendor(stripeMock)`, labelled "vendor" in every piece of evidence |

**What stripe-mock can't do.** stripe-mock answers Stripe's API calls with valid shapes, but it keeps no state and
sends no webhooks. So in a world, the event comes from the world itself (`s.stripe.sends`), signed with the world's
own generated secret. That proves our door, our decoding and our operation. It does not prove that Stripe sends what
we think it sends. That is the conformance test's job: in staging, against Stripe's own test mode (the vendor's
sandbox, the top rung of the stand-in ladder), it creates a real checkout, completes it with a test card, and checks
the webhook that arrives decodes with our schema.

**Provisioning at promote.** Stripe has to be told where the door is. The adapter declares a `provision` step
([`../deployment.md`](../deployment.md)): with the release key, it registers `https://api.acme.dev/_in/stripe` for
`checkout.session.completed`, reads back the signing secret, and writes it straight to the environment's store. No
person copies a webhook secret by hand.

## Where data lives

`Payment` lives in the database. It needs lists (an organisation's payments, newest first) and nothing about it races:
Stripe's events arrive one at a time per checkout, and `idempotent: "request"` with the event id as the key makes a
retry harmless. Stripe's own ids (`StripeCheckoutId`, `StripePaymentIntentId`) are values with a pattern, so a wrong id
is refused at decode, not at Stripe.

## Projections and what gets generated

- **server**: the three operations, plus the door `server.inbound` at `/_in/stripe`.
- **sdk** and **cli**: `payment.start` and `payment.refund` (`acme payment refund pay_… --amount 500`). `settle` is
  in neither: no person or agent can reach it, so the default `takes` rule leaves it out.
- **mcp**: `payment.start` only. Refund is `.notVia(Via.agent)`.
- **docs** and **portal**: all three, with `settle` shown as "called by Stripe".

## Proof

`ortho prove --env local` runs the journeys through the API, SDK, CLI and MCP replays, and prints what stood in:

```text
adapters   stripe → stripe-mock (vendor)   events from the world door, signed by the world
payment.start   9 evals ✔   payment.settle   9 evals ✔   payment.refund   9 evals ✔
```

## Today vs proposed

| | Today (`origin/layer/3`) | Proposed |
|---|---|---|
| Calling Stripe | nothing calls out; a step is only `Blueprint.step.database()` (`examples/acme/blueprint/things/allowance/verbs/spend.ts:15`) | `Blueprint.step.call` of an adapter's call |
| Webhooks | no inbound door | `on:` plus the adapter's door, as `service(stripe)` |
| Principal | `anonymous \| person` (`packages/orthograph/src/modules/roles/types.ts:6-8`) | adds `service` |
| Idempotency | `idempotent: "request"` exists for a caller's retry (`spend.ts:16`) | the same field, keyed by the event id at a door |
| Secrets | named by string per environment | declared by the adapter, names derived |

## Questions this raised

1. **How does a world send an adapter's event?** (a) A journey step `s.<mount>.sends(event, …)`, signed by the world.
   (b) The stand-in sends it, which only works for stand-ins that can (Stripe's CLI can trigger events, but needs a
   real test account). (c) No inbound journeys locally; only the cloud pass. *Recommend (a)*: it proves everything on
   our side of the door, and the conformance test covers the vendor's side.
2. **Should money going out default to people only?** (a) Every operation that calls a payment adapter's outgoing
   money call is `.notVia(Via.agent)` by default, and opting in is explicit. (b) Leave it to each operation.
   *Recommend (a)*, set by the adapter on the calls it marks as moving money.
3. **Who registers the webhook?** (a) The adapter's `provision` step at `promote`, with a restricted release key.
   (b) `promote` prints the line and a person does it. *Recommend (a)* for Stripe, falling back to (b) for any vendor
   with no API for it.
