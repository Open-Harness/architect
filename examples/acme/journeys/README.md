# Journeys and planted fixtures (stage 1)

Written by the journey author, not the builder. The builder never edits these files, the evals or the runner's generic checks.

## Files

- `blueprint/starting-worlds/founded.ts`: ada (`owner`) runs `organization.create({ name: "Acme Demo", cap: 1000n })`; it gives `organization`.
- `blueprint/starting-worlds/funded.ts`: from `founded`, ada runs `allowance.grant` to olga (`grantee`), limit 500; gives `organization` and `allowance`.
- `blueprint/starting-worlds/invited.ts`: from `founded`, ada runs `invitation.send` to olga's email; gives `organization` and `invitation`. Copied from the starter unchanged.
- `journeys/*.ts`: fifteen journeys, acme's own six, the starter's five and four principal journeys (M2.02, below). A journey's name is its file name with spaces, except where noted.
- `test/fixtures/evals/<eval>/`: one planted break per eval, each with its own README (what it replaces, what it breaks, the failure shape).

acme is the starter's things (system, person, session, organization, membership, invitation, api-key) plus the allowance. Its one change to the starter is that `organization` has a `cap` (an `Amount`) and `organization.create` takes `{ name, cap }`. The starter's journeys are copied here; the only edit is that `an owner makes an api key` passes `cap: 1000n` where Bob founds his own organisation. Everything else those journeys prove is as in `examples/starter/journeys/README.md`.

## Journeys

| Journey | World | Cast | What it proves |
|---|---|---|---|
| `grant-an-allowance` | `founded` | ada owner, olga and bob signed in | see below |
| `read-an-allowance` | `funded` | ada owner, olga grantee, bob signed in | olga and ada read the allowance (`active`, limit 500, spent 0; no events); bob is refused `NotAllowed` |
| `outsider-cannot-revoke` ("an outsider cannot revoke") | `funded` | bob signed in | bob's `allowance.revoke` is refused `NotAllowed`; no events; span `allowance.revoke` absent; still `active` |
| `revoke-then-spend` | `funded` | ada owner, olga grantee | ada revokes (`AllowanceRevoked`, `revoked`); olga's spend is refused `machine.notFrom { state: "revoked" }`; olga's revoke is refused `NotAllowed` |
| `spend-within-allowance` ("spend within an allowance") | `funded` | olga grantee | spends 120 (remaining 380, `AllowanceSpent`); 400 refused `AllowanceExceeded { remaining: 380n }`; spends the last 380 (`exhausted`); a further spend refused `machine.notFrom { state: "exhausted" }` |
| `spend-twice-with-one-request` | `funded` | olga grantee | the same request key twice answers the same and records one spend (`spent` is 100) |
| `health-is-up` | none | visitor (anyone) | starter: `system.health` answers "ok" |
| `sign-up-and-sign-in` | none | newcomer (anyone) | starter: `person.sign-up`, `PersonEmailTaken`, `session.sign-in`, `SessionCredentialsWrong` |
| `invite-and-accept` | `founded` | ada owner, olga and bob signed in | starter: send, accept, revoke an invitation; `membership.get`; `NotAllowed` for outsiders |
| `an-invitation-is-used-once` | `invited` | ada owner, olga signed in | starter: a second accept or a revoke after accept is refused `InvitationNotPending` |
| `an-owner-makes-an-api-key` | `founded` | ada owner, bob signed in | starter: only an owner makes a key; bob founds his own organisation (`cap: 1000n`) and makes one there |
| `a-key-and-a-session-are-the-same-person` | none | ada signed in | M2.02: `session.show` answers the same person and `via` as `session`, `key` and `agent` (a key and an agent key the world makes for ada) |
| `an-agent-passes-the-owner-rule` | `founded` | ada owner | M2.02: ada's agent invites and reads; `api-key.create` (`.via(Via.session, Via.device)`) refuses her agent and her own key, and her session makes one |
| `an-agent-cannot-consent-for-a-person` | `invited` | ada owner, olga signed in | M2.02: olga's agent is refused `invitation.accept` (`.notVia(Via.agent)`); an agent's tools lack it and `api-key.create` and hold `invitation.send`; olga accepts herself |
| `the-system-is-nobody-signed-in` | `founded` | clock system, ada owner | M2.02: `Blueprint.system` is refused `session.show` and `organization.create`, with no operation span and `<operation>.refused` present; ada is let through |

### grant an allowance (`journeys/grant-an-allowance.ts`)

| # | Call | Expected |
|---|---|---|
| 1 | ada `allowance.grant` olga, 500 | answers an `alw_` id; `AllowanceGranted { allowance, limit: 500n }`; allowance in `active`; spans `allowance.grant` and `allowance.grant.insert` |
| 2 | bob `allowance.grant` (own id, 500) | refused `NotAllowed`; no events; spans `allowance.grant` and `.insert` both absent (handler never ran) |
| 3 | ada `allowance.grant` olga, 1001 | refused `AllowanceLimitTooHigh { cap: 1000n }` (exit 44); no events; span `allowance.grant` present, `.insert` absent |
| 4 | ada `allowance.grant` to `per_nobody`, 500 | refused `Person.notFound`, the runtime's generated `PersonNotFound { id: "per_nobody" }` (PE-901, exit 4, K16 M1.46); no events; span `allowance.grant.insert` absent (handler never ran) |

Coverage this gives for the allowance: grant move 1/1, outcome `active` 1/1, refusals `AllowanceLimitTooHigh` and `NotAllowed`, and the runtime's `PersonNotFound`. The starter's five journeys cover the other eleven operations (see the starter's README).

## Fixtures

| Eval | Fixture | Break |
|---|---|---|
| 1 answer shape | `answer-shape/grant.ts` | answers a number for the id |
| 2 declared errors | `declared-errors/grant.ts` | fails with undeclared `AllowanceMemberUnknown` |
| 3 machine path | `machine-path/grant.ts` | moves to undeclared `paused` |
| 4 events | `events/grant.ts` | row written with no move, no `AllowanceGranted` |
| 5 who may call | `who-may-call/main.ts` | server runs the handler with no role gate |
| 6 steps | `steps/grant.ts` | declared `insert` step never run |
| 7 performance | `performance/README.md` | none; review only, never fails |
| 8 coverage | `coverage/rename*.ts` | new operation `organization.rename` no journey calls |
| 9 explainability | `explainability/grant.ts` | refusal with no deciding log |

## Expected on blank handlers

Every handler a scaffold writes returns `Handlers.blank(...)`, which dies with `BlankReached`. `organization.create` then dies inside the
`founded` world (`starting world founded: organization.create died: BlankReached`), and so do `funded` and `invited`, which start from it.
No journey that needs a world runs a step; only `health is up` and `sign up and sign in` can run. `prove` exits 1.

## Formats I chose where the docs were silent

- **Location.** The task put the journey in `examples/acme/journeys/`; the docs say `blueprint/journeys/`. The starting worlds are at the docs' path, `blueprint/starting-worlds/founded.ts`. The builder may move the journey to where `Layout.journeys` reads, or read both.
- **Calls.** The docs write `s.ada.invitation.send(...)`, which needs the generated SDK on the cast. I wrote `s.ada.run(operation, payload)`, naming the declaration by import (no name strings, per AGENTS.md).
- **Cast role.** acme has only `owner`; D2's "olga member" has no role yet. Olga and bob are `Blueprint.signedIn`; bob is an outsider because he isn't the organization's owner.
- **Person ids.** `s.<name>.person` is each cast member's world-issued person id (D2: tokens carry `person`).
- **Assertions.** Docs give `expect(...).toBe`, `refuses(Error, fields)`. New, mine: `emits(Event, fields)`, `noEvents()`, `machine.isIn(id, state)`, `spans({ present, absent })`, `expect(...).toMatch(regex)`. `s.last` is the previous step's answer and `s.world` the starting world's gives, as in the docs.
- **Starting-world calls.** `s.ada.run(create, payload)`, same form as in a journey; `starts: "founded"` names the world by its string, as the docs do.
- **Journey name.** `Blueprint.journey("grant an allowance", ...)`, the docs' first form with the kebab-case file name `grant-an-allowance.ts`.
- **Fixture install.** Each fixture file is written for its installed location (imports relative to the file it replaces), and a runner copies it over the target in a scratch copy of acme. Fixtures are outside the Nx graph (`.nxignore`, D2 #12) and not type-checked in place.
- **Handler context.** Machine-path uses `move` from the handler context (docs handlers do); the current `HandlerContext` lacks it. Declared-step results: `steps.insert(effect)` returns the effect's value.
- **Log eval placement.** The docs list "each refusal has the log that decided it" under steps (eval 6); the task assigns it to explainability, so `explainability/` plants it and `steps/` plants a missing span. Builder may keep the check in either eval as long as each fixture fails its named one.
- **Who may call.** The break cannot be a handler; the gate runs first. The fixture replaces `generated/server/main.ts` (grant route only) and must be regenerated to match what the generator then emits, with just the gate removed.
- **Fixture check.** A fixture passes when the named eval is among the failing evals; other evals may fail too.
