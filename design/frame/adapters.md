# Adapters: the outside world

Part of the frame ([`README.md`](README.md)). Proposed, 17 November 2026.

## What an adapter is

The system has a boundary. Inside are the things we own: declared, generated, proved in worlds. Outside are systems we
call or that call us and that we don't own: Stripe, Resend, an EVM chain and the contracts on it, a browser wallet,
the OS keychain, an LLM provider, GitHub, and another Blueprint app.

Every crossing of that boundary needs the same six things. An adapter is the plugin that provides all six, once, for
one outside system:

| | What | Why |
|---|---|---|
| 1 | **its shape**, owned by the outside system (an OpenAPI document, an ABI, another app's model) | one owner per shape; types generated from it, never retyped |
| 2 | **its calls out**, as typed exports with declared errors | a handler calls them as steps, so every call is a span and every failure is a value |
| 3 | **its events in**, as a door that verifies, decodes and calls one of our operations | everything that changes our state is an operation call |
| 4 | **a principal**, `service(<mount>)` with the outside account that sent the event (K40), for what comes in through that door | roles can allow it, `who may call` judges it |
| 5 | **its secrets**, declared by export | the key never appears as a string, and only the adapter reads its value ([`secrets.md`](secrets.md)) |
| 6 | **a stand-in for worlds**, and a conformance test against it | journeys run without the real thing; the stand-in is checked against the real contract |

An adapter adds no things and no operations of its own. Things and operations are what features add. That is the line
between the two: a feature changes *what the system is*; an adapter only brings *something outside* within reach.

## Why it is its own kind

The old design had two words for this, "dependency" (something you call) and "edge" (where a framework calls you), and
the K1 record used "dependency" and "inbound". They are two directions of the same crossing, and they always share a
secret, a shape and a stand-in. Stripe's API key signs the refund call; Stripe's webhook secret verifies the event that
says the refund settled; both run against one Stripe stand-in in a world. One plugin, one mount, one place to look.

## How it is used

### Mounting

```bash
ortho add adapter @orthograph/stripe
```

```ts
// blueprint/adapters/stripe.ts: the mount is called `stripe`, after its file
import { Blueprint } from "orthograph";
import stripe from "@orthograph/stripe";

export default Blueprint.use(stripe, (s) => [
  s.include(s.calls.refunds.create),          // what this app may call: only what it names, nothing else of Stripe's
  s.include(s.calls.checkout.sessions.create),
  s.include(s.events.checkoutCompleted),      // what this app accepts in: some operation must take it (below)
]);
```

The mount's `include` narrows the outside system to what the app uses. Stripe has hundreds of endpoints; acme reaches two. That
list is what the model, the docs and `impact` know about.

### Calling out, from a handler

The call is a step, declared on the operation, so its span and its errors are part of the contract:

```ts
// blueprint/things/organization/verbs/refund.ts
import stripe from "../../../adapters/stripe.ts";

export default Blueprint.operation(Organization, {
  payload: { payment: PaymentId, amount: Amount },
  answer: { refund: RefundId },
  errors: [RefundTooLarge],
  allowed: [owner.of("organization").via(Via.session)],
  steps: { refund: Blueprint.step.call(stripe.calls.refunds.create) },
});
```

```ts
// src/organization/refund.ts: the handler gets the step, typed with Stripe's own errors
const refund: Handler = ({ payment, amount }, { steps }) =>
  Effect.gen(function* () {
    const r = yield* steps.refund({ payment_intent: payment, amount }).pipe(Effect.either);
    if (r._tag === "Left" && r.left._tag === "StripeInvalidRequest") return yield* new RefundTooLarge({ asked: amount }); // map what you can answer
    if (r._tag === "Left") return yield* Effect.die(r.left); // anything unmapped is a defect
    return { refund: r.right.id };
  });
```

The one blank an adapter call leaves is the mapping: which of the outside system's errors become your declared errors.
Anything you don't map is a defect, not a refusal, and the `declared errors` eval says so. That is the "failure mapping
is the one blank" from `decisions.md`, made concrete and type-checked.

### Events coming in

Each event the mount includes is taken by one of our operations, which says so in its own declaration, and is called
as the adapter's principal. The mount imports nothing of the app's, so nothing imports in a circle:

```ts
// blueprint/things/payment/verbs/settle.ts
import stripe from "../../../adapters/stripe.ts";

export default Blueprint.operation(Payment, {
  payload: { payment: PaymentId },
  move: machine.moves.settle,
  allowed: [processor],
  on: [Blueprint.on(stripe.events.checkoutCompleted, (e) => ({ payment: e.data.object.payment_intent }))], // their payload to ours
});
```

```ts
// blueprint/things/payment/roles.ts: the only caller allowed to settle a payment is Stripe
export const processor = Blueprint.role(Payment, { service: stripe });
```

The adapter's door verifies the signature with its own secret, decodes with the schema from Stripe's contract,
continues the trace, and makes the call. From there it is an ordinary operation call: roles, moves, events, steps,
evals. Nothing about webhooks is special after the door.

### Another Blueprint app

A Blueprint app publishes its SDK and its model ([`projections.md`](projections.md)). The model is a complete contract,
so an adapter for another Blueprint app is generated, not written:

```bash
ortho add adapter @acme-billing/sdk --as billing
```

Its calls are the other app's operations that admit a `service` principal (a `Via.key` way in); its errors are their
declared errors, already typed; its events in are their events, delivered to a door; and its stand-in is a world of
the other app itself, made from its published bundle. This is how two Blueprint apps talk: each is outside the other,
and each is an adapter to the other. It is also why "one app, one model" holds: a second app is never merged in.

### Adapters on other hosts

Adapters are not only server-side. A browser wallet is an outside system on the browser host, and the wallets feature
needs one when a browser signer is chosen ([`writing-a-feature.md`](writing-a-feature.md)). Its node signer needs no
adapter: it keeps keys in a keystore file of its own format. An OS keychain would be another adapter, later.

```ts
// @orthograph/eip1193: an adapter for whatever wallet the browser offers
export default Blueprint.adapter({
  host: [Host.browser],
  shape: Eip1193.contract,            // the standard's methods and errors
  calls: { requestAccounts, signTypedData, personalSign },
  events: { accountsChanged },          // events in, here from the wallet to the page
  standIn: Stand.process(anvilWallet), // a real local signer backed by Anvil's test keys, driven by the world
  // secrets and needs go here too when an adapter has them; this one has neither
});
```

### Adapters inside features

A feature that needs an outside system names the adapter in its descriptor; it does not contain it:

```ts
// @orthograph/payments/blueprint/feature.ts
export default Blueprint.feature({ needs: [auth, stripe] /* uses stripe.calls.checkout.sessions.create, stripe.events.checkoutCompleted */ });
```

`ortho add feature @orthograph/payments` sees the need, and either finds a Stripe mount that already includes the
calls and events the feature uses, offers to widen it, or offers to mount Stripe. One Stripe mount per app serves the payments feature,
the app's own refund handler and the webhook, with one secret and one stand-in. Two mounts of one adapter (`stripe-eu`
and `stripe-us`) are two outside systems, with their own names, secrets and stand-ins.

## Stand-ins and the "local, never fake" rule

Journeys run in worlds, and a world can't call the real Stripe. Each adapter declares what stands in for the outside
system, honestly, and the evidence records it:

| Stand-in | What it is | Examples |
|---|---|---|
| `Stand.process(...)` | a real program run locally that speaks the real protocol | Anvil for a chain; a Mailpit SMTP server; another Blueprint app's world |
| `Stand.vendor(...)` | the vendor's own local or test service | stripe-mock (Stripe's open-source mock of its API); a provider's sandbox mode, which needs a test key |
| `Stand.none` | nothing can stand in locally | the adapter's journeys run only in the cloud pass, and `prove` says so per call |

The conformance test runs the adapter's declared calls against the stand-in and, in the cloud pass, against the real
service, and fails if their shapes disagree. That is what keeps a stand-in honest.

`prove` prints what each adapter ran against:

```text
$ ortho prove --env local
adapters   stripe → stripe-mock (vendor)   chain → anvil (process)   resend → none: 2 journeys left for the cloud pass
```

## What an adapter adds to the model

```text
adapter stripe 3.1.0   mounted at blueprint/adapters/stripe.ts
  calls      refunds.create · checkout.sessions.create        errors: StripeCardDeclined, StripeInvalidRequest, …
  events in  checkoutCompleted → payment.settle               principal: service(stripe)
  secrets    stripe.secrets.apiKey · stripe.secrets.webhookSigning
  stand-in   stripe-mock (vendor)
  used by    organization.refund (step refund) · payments feature
```

`impact` uses it: upgrading the adapter to a version whose `refunds.create` changed its errors names every operation
that calls it.

## Writing an adapter

Most adapters are generated from a contract the outside system already publishes, then narrowed by hand:

```bash
ortho new adapter stripe --from-openapi https://raw.githubusercontent.com/stripe/openapi/…/spec3.json
ortho new adapter usdc --from-abi ./abi/usdc.json --chain
ortho new adapter billing --from-model @acme-billing/sdk
```

What the author writes: which calls and events the adapter offers, its error names, its secrets, its door's
verification (Stripe's signature scheme, Svix's for Resend), and its stand-in. What the author never writes: request and
response types, which come from the contract.

## Today vs proposed

| | Today (`origin/layer/3`) | Proposed |
|---|---|---|
| Calls out | none; `decisions.md` layer 3 plans "a dependency is something you call" | adapter calls as steps, errors mapped in the handler |
| Events in | none; "an edge is where a framework calls you" is planned | an operation's `on:` takes an adapter's event, called as `service(<mount>)` |
| Service principals | `Principal` is `anonymous \| person` (`blueprint/src/modules/roles/types.ts:6-8`) | `service` added beside `person` and `agent` |
| Stand-ins | Anvil planned for the chain (`spikes/world-anvil-container/`) | every adapter declares one, and evidence names it |
| Another app | not designed | an adapter generated from its model |

## Open questions and risks

- **Does a vendor's own mock count as real?** stripe-mock is Stripe's code and speaks Stripe's API, but it is a mock.
  "Local, never fake" (Aaron, 16 November 2026) bans our own fakes; whether a vendor's counts is Aaron's call. The
  proposal treats it as a declared, labelled stand-in, never silently.
- Some outside systems publish no machine-readable contract (Resend has an OpenAPI document; many don't). Those
  adapters are hand-written and only as good as their conformance test.
- Events that arrive out of order or twice: the door keys each event by the object it is about, never by a delivery id, so a webhook and a catch-up poll settle once (K40), and a move
  that may arrive twice by another path declares `unchanged` (K21).
