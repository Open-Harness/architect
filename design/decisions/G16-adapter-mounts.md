# G16-adapter-mounts: how an app uses a generated adapter end to end

**Decided 25 November 2026** by Goal 16's checks author for snag #995, approved by Goal 16's lead under CX-takeover (Goal 17 is
not running). Proposed and approved on #995 (https://github.com/Open-Harness/orthograph/issues/995#issuecomment-7148401443).

## The problem

Capxul's Bridge adapter (#716) found five framework gaps that keep an app from using a generated adapter through the real door:

1. A call step can't reach a generated adapter.
2. `prove` doesn't start an adapter's stand-in.
3. A journey can't reach a stand-in.
4. An incoming event can't run an app operation.
5. The webhook door verifies only HMAC.

Call steps wire only `<package>/src/calls/<call>.js` (`packages/projections/src/modules/handlers/internal/calls.ts`). A
generated adapter has only `src/client.ts`, whose `client({ baseUrl, token })` needs a URL and a key that no environment gives
a mount. A world sets `AUTH_SECRET` and a few telemetry variables and nothing for a stand-in
(`packages/prove/src/modules/world/service.ts`). The journey language has no stand-in step. `AdapterDoor.verify` is
HMAC-SHA256 in hex only (`packages/orthograph/src/modules/plugins/door-types.ts`).

Gaps 2 and 3 are built small, from GOAL17-check-harness's own surface, not by landing Goal 17's draft #781.

## The calls

### 1. A mount's base URL and key (gap 1)

- **Where they come from.** A generated adapter (one with `src/client.ts`, no `src/calls/`) declares two stored runtime
  secrets in its own `blueprint/secrets.ts`:
  - `baseUrl`, always;
  - `apiKey`, when its description requires security: a requirement naming a scheme, at the top or on any operation. A
    scheme that no requirement names, or only the anonymous requirement `[{}]`, requires none, so no key is listed as missing
    that no call would send. A key made optional (`[{}, { ApiKey: [] }]`) still requires one, and Bridge's shape (an `apiKey`
    scheme in its `Api-Key` header, required at the top) gives `BRIDGE_API_KEY`. (Refined from "declares any security scheme"
    by #995 gap 1's checks, 25 November 2026; approved by Goal 16's lead.)

  By M2-04-secrets-readings' rule they're named per mount: `<MOUNT>_BASE_URL` and `<MOUNT>_API_KEY` (`BRIDGE_BASE_URL`,
  `BRIDGE_API_KEY`). So `ortho secrets` lists them, `ortho secrets set` takes them, and `promote` refuses an environment that
  lacks one. Two mounts of one adapter never share a URL or a key. A URL isn't secret; a secret is used anyway, because
  settings are `{}` until M2.06 and nothing else reaches a Worker per mount.
- **How a call step runs.** A call step on such a mount (`Blueprint.step.call(bridge.calls.customers.create)`) runs
  `client({ baseUrl, token: apiKey }).calls.customers.create(input)`, with the step's one argument as the input.
  What it fails with goes to the handler's one mapping, as a Promise call's does today: `ApiFailure`, `InputRefused`,
  `AnswerRefused` and `Unreachable`, each a value with its `_tag`.
- **The errors a generated call declares** (signed off by the lead on #995, 25 November 2026). The runner's `declared` judges the
  refusal a mapping returns, which must be a `Blueprint.error` the call declares. A generated call declared none, so it could
  never be refused. The client's own failures are `Data.TaggedError`s, which no operation can refuse with. So the generator writes
  four `Blueprint.error`s per adapter in `blueprint/things/<adapter>/errors.ts`, re-exported from the package's main entry:
  - `<Adapter>ApiFailure { status: Blueprint.uint(16), code? }` (a `uint` is a bigint in code and a string on the wire, so a
    mapping passes `BigInt(failure.status)`);
  - `<Adapter>InputRefused`;
  - `<Adapter>AnswerRefused`;
  - `<Adapter>Unreachable`.

  `<Adapter>` is the adapter's name in Pascal case (`RatesApiFailure`); the prefix keeps two adapters' errors apart. Every
  generated call is `Blueprint.call({ errors: [those four] })`. An operation lists the ones it refuses with, and its mapping
  turns the client's failure into its namesake. The runner is unchanged: a mapping to anything the call doesn't declare,
  the app's own errors included, stays a defect. This is m1's pattern (`e2e/fixtures/m1/remote`'s `PriceUnavailable`). A
  first proposal, letting a call that declares no errors map to any error of the operation, was withdrawn.
- **A generated plugin's `package.json` exports its blueprint** (`"./blueprint/*.js": "./blueprint/*.ts"`), because the generated
  API imports an adapter's errors as `<package>/blueprint/things/<adapter>/errors.js`.
- **The compiler reads a plugin's `secrets.ts`.** Today it reads only a built plugin's `secrets.js`, so a workspace plugin's
  declarations (every generated adapter in an app's `plugins/`) are skipped.
- **In a world,** `ORTHO_STAND_<MOUNT>`, the stand-in's URL (GOAL17-check-harness), wins over `<MOUNT>_BASE_URL`. A world
  never reaches the real service.
- **No base URL at all is a defect,** not a refusal: the operation answers 500, nothing is sent, and the defect on its span
  names `<MOUNT>_BASE_URL`. There is no default from the description's `servers`, which would send a test environment to
  production (Bridge's is `https://api.bridge.xyz/v0`).
- **Known limits** (#995 gap 1's checks, 25 November 2026):
  - The four errors' thing takes the compiler's default refusal prefix, its name's first two letters, unless the plugin's
    scaffolded `src/written.ts` exports a `code`, which the generated `thing.ts` reads. Two generated adapters whose names
    share those letters (`open` and `optional`, `github` and `gitlab`), or one whose letters another thing owns, need one
    set there by hand. The superagent's `posthog` sets `PH`, because intake's `policy` owns `PO`. (#995 gap 1's build,
    25 November 2026: without it the superagent app could not mount its own PostHog adapter.) Snag #1012 may still add
    `ortho new adapter --code` to write it at the first run.
  - A mount is wired as a generated adapter's when its plugin declares a `baseUrl` secret, which the generator always writes. A
    hand-written adapter that declares one too would be wired to a `client` it may not have (#1021's review). Nothing does
    today; a positive marker in the mount model is the fix when one does.
  - Every generated adapter's four errors take exits 81 to 84, so one operation that calls two generated adapters and lists
    both adapters' errors is refused (`operationExitClashes`; found by Codex on #1021, 25 November 2026). Snag #1012
    fixes it by the next call.
  - An exit base that isn't a whole number (`85.5`) isn't tried by check 07; the compiler's check of each exit already refuses
    one ("not a whole number").
  - The key is the adapter's, not the mount's calls': a mount that includes only calls needing no key still lists one, and so
    does a description whose every operation overrides its top-level requirement with `security: []`.
- **An adapter's exits are set by hand** (Goal 16's lead, on #1028, 25 November 2026). Beside `code`, the plugin's
  scaffolded `src/written.ts` may export `exit`, one base: its four errors take base to base+3. Unset, they stay 81 to 84,
  so one adapter needs no setting. Two adapters whose exits clash in one operation are refused by `generate`, naming both
  adapters and the `exit` in `src/written.ts` that fixes it. A base whose four exits leave 5 to 119 is refused, naming the
  adapter, the setting, and the base or the exit that leaves. The scaffold may write the `exit` line itself, as it
  writes `code`'s. Not from a hash of the name, which can still clash and can't be fixed by hand; not assigned by
  the compiler, which would move exits when an unrelated adapter is added, as `refusals.lock` exists to stop. Check 07
  pins it. Built on `goal-16/snag-1012-build`: the generated `errors.ts` reads `exit` from `src/written.ts` as
  `thing.ts` reads `code`, and the compiler knows a generated adapter by the `src/written.ts` its package has, so only
  its exit refusals name that setting; a hand-written adapter's still name its errors file.

### 2. Bridge's signature at the door (gap 5)

`AdapterDoor.verify` gains a second form. M5-reach-out's call 1 left a sender that doesn't sign with HMAC to "the adapter's own
verifier in its `src/`". That route stays open, and is still not built; this adds a second, built-in form beside the HMAC one,
because `AdapterDoor` is pure data the compiler reads and the Worker runs (`door-types.ts`), and Bridge's scheme is one more
senders can share. Nothing of M5-reach-out is superseded:

```ts
verify: { scheme: "rsa-pkcs1-sha256", header: "x-webhook-signature", within: 600 }
```

The present HMAC form is unchanged, and a `verify` with no `scheme` is HMAC.

- **What the scheme means.** The header is `t=<ms>,v0=<base64>`. The signature is RSASSA-PKCS1-v1_5 under the endpoint's
  public key, over SHA256(SHA256("<t>.<raw body>")): WebCrypto's `verify` with SHA-256, handed SHA256("<t>.<body>").
  This is Bridge's published scheme (https://apidocs.bridge.xyz/platform/additional-information/webhooks/signature). Its
  Node, Python, Go and Java samples (get-started, "Configure webhooks") each hash `"<t>.<body>"` and verify that digest with
  PKCS#1 v1.5 SHA-256, and treat `t` as milliseconds.
- **The header.** `t` is the milliseconds as written, and the digest is over `t` and the body's bytes exactly as they came.
  `v0` is decoded strictly, as Bridge's page says: unpadded or otherwise loose base64 is refused. The header's name and
  `within` are the rule's, never Bridge's defaults written in.
- **The key.** The public key is a PEM (SPKI) held in `<MOUNT>_WEBHOOK_SIGNING`, the door's existing secret. Its body may be
  on one line or in lines ending CRLF.
- **The window.** A delivery more than `within` seconds from the door's clock, either way, is refused. A delivery exactly
  `within` seconds away is taken. The door's clock is the world's, so a stepped world judges it at the world's instant.
- **The refusal.** Every refusal is the door's one answer, 401 `{ _tag: "BadSignature" }`, with nothing written. Bridge's
  page suggests a 400 for a stale event; any non-2xx makes Bridge retry, and the door keeps one refusal for every sender.

### 3. prove starts a mount's stand-in (gap 2)

- **Which mounts.** Each mount whose adapter has a process stand-in: `standIn` in the model, entry file in its
  `package.json`'s `orthograph.standIn`.
- **How it runs.** A world prove starts runs `node <entry> --port 0 --dir <the world's state>/stands/<mount>`, the contract
  `e2e/superagent/servers.ts` already holds. prove reads `stand-in listening on <url>` and passes `ORTHO_STAND_<MOUNT>=<url>`
  to the Worker. When the world ends, prove stops the stand-in and everything it started.
- **Its edges** (#995 gap 2's checks, 25 November 2026). The folder is there when the stand-in starts. A mount whose adapter's
  stand-in is `Stand.none` or `Stand.vendor` gets no process, even when its package names an entry. A stand-in that exits
  before it says where it listens fails the world, naming the mount, and leaves nothing running. "Everything it started"
  is the stand-in's processes too: prove stops a stand-in's own children, not only the stand-in.
  The stand-in runs in its package's folder, as `e2e/superagent/servers.ts` runs one. Its line counts once it is whole
  (ended by a newline), whatever came before it or however it was split; prove keeps reading the stand-in's stdout and
  stderr after it, so a stand-in that goes on talking never blocks. A stand-in that exits with any code before its line, or
  says no line within 60 s, fails the world. Stopping escalates to SIGKILL, so a stand-in that ignores SIGTERM still goes.
  An early exit fails it at once, not at the 60 s mark: prove is done within 30 s of the exit, and within 90 s of a silent
  stand-in's start. The grace before SIGKILL is at most 10 s, as `e2e/superagent/servers.ts` gives, and the stand-ins are
  stopped together, not one after another. Check 10 holds those bounds.
  (Added from the hostile pass on #1016, 25 November 2026.)
- **Known limit: the key is judged only where a call reaches it.** No check sees that a `Stand.vendor` or `Stand.none` mount
  is not given `world-<mount>`; the contract says the key is for "each mount it stood up".
- **A world of its own** (signed off by Goal 16's lead, https://ampcode.com/threads/T-01a2093c-8643-7794-9ce7-5dbc110ce4aa,
  25 November 2026; recorded on #995). A model with a process stand-in makes prove take
  a world of its own, as a device chain does (`needsDevice`): a warm `ortho dev` world is not reused, and every run starts
  with fresh stand-in state.
- **Known limit: no stand-ins under `ortho dev`.** Its world starts none, so a generated call there fails on the missing
  `<MOUNT>_BASE_URL` (call 1's 500) and never reaches a real service. Stand-ins in dev, with `Warm.reset` restarting them,
  are in `design/later.md` until a developer needs them.
- **The key.** prove gives the Worker `<MOUNT>_API_KEY` = `world-<mount>` for each mount it stood up. A stand-in that
  requires a key gets one, and two mounts still differ.

### 4. A journey reaches a stand-in (gap 3)

- **The step.** `Stand.command<Args, Answer>(mount, name)(args)` is a step's call, `{ kind: "stand-call", mount, command, args }`.
  That is GOAL17-check-harness's surface (call 0) and nothing else from #781.
- **What prove does with it.** prove posts `args` as JSON to `<ORTHO_STAND_<MOUNT>>/_stand/<name>`. A 2xx JSON answer is
  the step's answer (`s.last`). A non-2xx fails the step, naming the mount, the command and the status. So does a mount with
  no stand-in running.
- **Its edges** (#995 gap 3's checks, 25 November 2026). `args` are resolved as an operation's payload is, so a later step
  can send what an earlier one answered (`s.last.token`), and they go once, as `application/json`, to the mount's own
  stand-in. The step's checks judge the answer, as an operation step's do. A stand-call runs no operation, so, like a clock
  step, it expects no span, and the compiler's journey reader skips it as it skips a clock step. A mount with no stand-in
  running sends nothing anywhere.
  Only a 2xx is an answer: a 3xx fails the step as a 4xx does. A failed stand-call leaves `s.last` as it was, and the
  journey goes on, as after an operation's refusal. The address is the world's, from the stand-in prove started, never an
  `ORTHO_STAND_<MOUNT>` in prove's own environment. The command's name goes into the path as written, dashes and all.
  (Added from the hostile pass on #1025, 25 November 2026.)

### 5. An incoming event runs an app operation (gap 4)

Signed off by Goal 16's lead on 26 November 2026 (#995). Gap 4 is M5.03's delivery half, built for inbound events only:
M5-reach-out Q1 to Q5 decide the outbox, `on:`, the request key `on|<event id>|<operation>` and the `service(<mount>)`
caller, and GOAL17-check-harness call 3 puts the drain on `Timers`. This call settles what those leave open. Move events
stay M5.04's, and `ortho outbox redeliver` and `POST /_world/outbox/redeliver` are M5.04's too.

- **The name.** A `Mount` gains `events`, its adapter's own `AdapterEvent` values, so an app writes `bridge.events.kycLink`.
  `Blueprint.on` takes an `AdapterEvent` as well as a `Blueprint.event`; its `map` gets the decoded payload, and `meta`
  `{ id, source: <mount>, at }` second. Two mounts of one plugin are already refused, so an event names one mount.
- **What the compiler refuses** (Q3.4): an `on:` naming an event its mount doesn't `include`; an operation whose `allowed`
  doesn't admit `service(<mount>)` (`Blueprint.anyone` admits it); two `on:` entries of one operation taking one event. Each
  names the operation and what is wrong.
- **The door.** An event some `on:` subscribes to is taken whether or not a source maps it. Its inbox row and one `_outbox`
  row per subscribing operation (`event` `<mount>:<the event's id>`, `to` `op:<thing>.<verb>`) are one batch. A repeat
  (`seen`) writes no outbox row, and an event no `on:` takes writes none. The superagent's sources behave as before.
- **The delivery.** The operation runs as `{ kind: "service", mount, actor? }`, in the trace of the door's request, so its
  journal row has that trace. A delivery due now is counted work (`Busy`) from the door's commit: the world is not quiet
  until it has run, so a clock step, a zero step and a world's reset all wait for it. The door answers without waiting.
- **Refusals and defects.** A refusal is `refused` with its tag after one attempt and is never retried. A defect (a `map`
  that throws or answers a payload outside the declaration included) is retried on Q5's schedule, 1 s doubling, never more
  than an hour between, 15 attempts, then `failed`. Every wait is `Timers`, so a stepped world steps the backoff: there is
  no `ORTHO_OUTBOX_BACKOFF` (GOAL17-check-harness call 3), and a real world's alarm drives the same drain.
- **What a check reads.** `GET /_world/outbox` answers `rows`, GOAL17-check-harness call 3's `OutboxRow` (`outcome` is the
  refusal's tag or the defect's first line).
- **Settling.** A journey's `s.clock.settle()` is `advance("0 seconds")` (GOAL17-check-harness call 3): wait until quiet,
  move nothing, fire only what is due now. After one failed attempt it answers at once, the row `pending` and due later. A
  delivery that never ends makes it refuse `NeverQuiet` within `ORTHO_QUIET_MS`, naming the delivery by its event and its
  operation. `s.world.settles()` is not built: `s.world` is what the starting world gave, so a method on it is a value.

## The checks

Each gap's checks land on `main` as their own pull request, red, with a ratchet list:

- **Gap 5:** `packages/host-cloudflare/src/modules/inbound/rsa-door.test.ts`.
- **Gap 1:** `e2e/m2/07-generated-adapter-calls.test.ts`.
- **Gap 2:** `e2e/m2/10-prove-stand-ins.test.ts`.
- **Gap 3:** `e2e/m2/09-journey-stand-calls.test.ts`.
- **Gap 4:** `e2e/m2/14-inbound-events-run-operations.test.ts`.
- The others are added here as they land.

## Supersedes

- GOAL17-check-harness call 0: "a non-200 fails the step, naming the mount, the command and the answer" → "a non-2xx fails the step, naming the mount, the command and the status"
- ST1-24-warm-world: "or a model whose plugins run on a device (they need a chain of their own) never reuses" → "a model whose plugins run on a device, or a model with a process stand-in, never reuses"
- G16-adapter-mounts call 1, as merged in #1003: "`apiKey`, when its description declares any security scheme" → "`apiKey`, when its description requires security"
- G16-adapter-mounts call 1, as merged in #1010: "and an app can't set `code` on a generated file" → "unless the plugin's scaffolded `src/written.ts` exports a `code`, which the generated `thing.ts` reads"
- GOAL17-adapters-from-spec: "Declared error classes per response are not generated yet: `Blueprint.call()` is given none." → "every generated call is `Blueprint.call({ errors: [<Adapter>ApiFailure, <Adapter>InputRefused, <Adapter>AnswerRefused, <Adapter>Unreachable] })`"
- M5-reach-out, what a journey can do: "`s.world.settles()`: until M8.07" → "`s.clock.settle()` (GOAL17-check-harness call 3; G16-adapter-mounts call 5): from M8.07"
