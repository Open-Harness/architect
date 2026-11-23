# Secrets

Part of the frame ([`README.md`](README.md)). Proposed, 17 November 2026.

## The principle

A secret is a value the description names but never holds. The plugin that needs it declares it; the environment says
where its value comes from; only the declaring plugin's code ever sees the value, and only as a `Redacted`. Nobody types
a secret's name as a string, and nothing prints, logs or traces a value.

## Today, in code (`origin/layer/3`)

```ts
// packages/orthograph/src/modules/secrets/types.ts
export interface Secret {
  readonly kind: "secret";
  /** `generated` is made for each world or environment; `stored` is put there by whoever runs it. */
  readonly how: "generated" | "stored";
}
```

```ts
// packages/orthograph/src/modules/environments/environments.test.ts:14: an environment names its secrets by string
secrets: { RELAYER_KEY: Secrets.secret.stored() },
```

- Locally, `prove` writes every named secret into `.ortho/environments/<env>/secrets.env`, mode 0600, and hands it
  to wrangler as `--env-file`, so no value is on a command line (`prove/src/modules/environments/internal/secrets.ts`,
  D3 #2 and #20). Every name, `stored` included, gets a generated value locally.
- Today `AUTH_SECRET` is built in (under this frame, the auth feature declares it). A world makes a fresh one per run (`host-cloudflare/src/modules/world/types.ts:7-8`).
- The model holds names and how each gets its value, never a value (D3 #22).
- Field visibility (`public`, `private`, `secret`) keeps secret *data* out of spans, logs and MCP answers (L2.P,
  `language-effect/src/modules/handler/internal/attributes.ts:2`). That is a different thing: a secret field is data a
  thing holds; a secret is a credential the system uses. These documents call the first "secret fields".

What is missing: names are strings in each environment, nothing says which code needs which secret, and a handler has
no way to use one.

## Three kinds, by who holds them

| Kind | Used by | Held in | Examples |
|---|---|---|---|
| **runtime** | a running place: the Worker, an actor, the keeper | the environment's secret store (Cloudflare secrets in the cloud, `secrets.env` locally) | Stripe's API key, the webhook signing secret, `AUTH_SECRET`, the relayer's key |
| **release** | shipping: `promote` and `publish` | CI's secrets, never a running place | the npm token, the Cloudflare API token, the Homebrew tap's deploy key |
| **builder** | the tools that build: the agent harness, benchmarks | the developer's machine or CI, by name | a model provider's API key |

A runtime secret never reaches CI's shipping step, and a release secret never reaches a Worker. The model knows which is
which, so `check` can refuse a projection that asks for one in the wrong place.

## Declaring one

The plugin that needs a secret declares it, by export, in its own `blueprint/secrets.ts`:

```ts
// @orthograph/stripe/blueprint/secrets.ts
import { Blueprint } from "orthograph";

export const apiKey = Blueprint.secret.stored({ describe: "Stripe's secret API key, sk_…", test: "sk_test_…" });
export const webhookSigning = Blueprint.secret.stored({ describe: "The endpoint's signing secret, whsec_…" });
```

```ts
// your own app, if it needs one: blueprint/secrets.ts
export const invoiceSigning = Blueprint.secret.generated({ bytes: 32 });
```

A secret is a runtime secret unless it says otherwise:

```ts
// @orthograph/npm/blueprint/secrets.ts: the npm release projection's token, held by CI only
export const publishToken = Blueprint.secret.stored({ kind: Secret.release, describe: "An npm automation token" });
```

The secret's name in the environment comes from the mount and the export, so it is never written by hand:

| Declared | Mount | Name in the environment |
|---|---|---|
| `apiKey` in `@orthograph/stripe` | `blueprint/adapters/stripe.ts` | `STRIPE_API_KEY` |
| `apiKey` in `@orthograph/stripe` | `blueprint/adapters/stripe-eu.ts` | `STRIPE_EU_API_KEY` |
| `invoiceSigning` in the app | the app | `INVOICE_SIGNING` |
| `secret` in `@orthograph/auth` | `blueprint/features/auth.ts` | `AUTH_SECRET` |

Two mounts of the same adapter get two secrets automatically. Mounting a plugin adds its secrets to every environment;
unmounting removes them.

## Using one

Only the code of the plugin that declared a secret can read it, and it is given the value as a service, at the
composition root. A handler never reads the environment:

```ts
// @orthograph/stripe, its /worker entry: the adapter's own layer, given its secret by the generated server
export const layer = Blueprint.layer(stripe, ({ secrets }) =>
  Effect.gen(function* () {
    const key = yield* secrets.apiKey;            // stripe.secrets.apiKey, as Redacted<string>: printing it shows <redacted>
    return makeClient({ apiKey: Redacted.value(key) });
  }),
);
```

```ts
// the app's handler never sees the key: it calls the adapter's step
steps.refund({ payment_intent: payment, amount })
```

An app's own secret is read the same way: through its own `secrets` export, by the app's own service layer in `src/`,
the one place the app builds the services its handlers use. The generated
server (`generated/server/main.ts`) is the one place that reads the environment and hands each layer its secrets. That
follows the house rule that only `main.ts` reads `process.env`, and it is what makes every handler testable without a
secret.

Telemetry can't leak one: a `Redacted` is never an attribute, and the attribute allowlist from L2.P already drops any
field not declared public.

## Where values come from, per environment

An environment doesn't list names any more; they come from the mounts. It only says where values come from when the
default isn't right:

```ts
// blueprint/environments/local.ts: nothing about secrets. Generated ones are made; stored ones use their test value
export default Blueprint.environment({ /* … */ });
```

```ts
// blueprint/environments/production.ts
export default Blueprint.environment({
  secrets: Secrets.from(Cloudflare.secrets),   // every runtime secret lives in the Worker's secret store
});
```

| Environment | `generated` secrets | `stored` secrets |
|---|---|---|
| a world (prove, dev) | fresh each run | the adapter's declared `test` value, or the stand-in's own credential; never a real key |
| local, test | made once, kept in `secrets.env` (0600) so sessions survive a restart | the `test` value, unless set |
| staging, production | made once by `promote`, put straight into the store | set by a person, once, with `ortho secrets set` |

Layer one's "no cloud, no key" holds: every world and local environment runs with no real credential, because every
stored secret has a test value or a stand-in that accepts one.

## The commands

```text
$ ortho secrets --env production
STRIPE_API_KEY          stored     runtime   set 12 Nov
STRIPE_WEBHOOK_SIGNING  stored     runtime   missing
AUTH_SECRET             generated  runtime   set 2 Nov
NPM_TOKEN               stored     release   in CI
```

```bash
ortho secrets set stripe.apiKey --env production   # prompts without echo, or reads stdin; writes to the store
```

It never prints a value, never takes one as an argument (where `ps` and shell history would see it), and never writes
one to a file in the repository. `promote` refuses an environment with a missing stored secret, naming it.

## The builder agent and secrets

A builder agent never sees a value ([`builder.md`](builder.md)). Its tools run operations in worlds, where every secret
is generated or a test value. It can list which secrets exist and whether they're set, which is all it needs to tell a
person "production needs `STRIPE_WEBHOOK_SIGNING` before this can be promoted".

One builder secret is proposed: a read-only query token for staging's telemetry, so an unattended builder can read
staging redacted ([`builder.md`](builder.md) section 9). The builder projection declares it
(`Blueprint.secret.stored({ kind: Secret.builder })`), it is held where the harness runs, never in a Worker, and it is
created only with Aaron's written yes.

## Today vs proposed

| | Today | Proposed |
|---|---|---|
| Who declares | the environment, by string (`secrets: { RELAYER_KEY: … }`) | the plugin that needs it, by export |
| Names | written by hand, checked to be `UPPER_SNAKE_CASE` (D3 #22) | derived from mount and export |
| Who reads | nothing but auth's built-in `AUTH_SECRET` | only the declaring plugin's layer, as `Redacted` |
| Kinds | one | runtime, release, builder |
| Local values | generated for every name | generated, or the declared test value |
| Setting a value | not designed (cloud pass) | `ortho secrets set`, no echo, straight to the store |

## Open questions and risks

- Rotation is not designed. A rotated Stripe key means two valid values for a while; the store would hold both, and the
  layer would try the new one first. Later.
- `Cloudflare.secrets` means each Worker's own secrets, not the account-level Secrets Store, so destroying a Worker
  leaves no secret behind ([`decisions/M7-cloud.md`](../../../decisions/M7-cloud.md)).
- A feature's journeys that need a real stored secret (a provider with no stand-in) can't run locally; `prove` says so
  per journey, as for an adapter with `Stand.none`.
