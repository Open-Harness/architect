# M1-plugged-in: what M1.40 takes from Codex's `links/stage-1`

Decided 19 November 2026 by the 🧭 M1 lead, under "Who decides" in `AGENTS.md`. It settles M1.40's source: the row
says Plugged In at stage 1 "started from Codex's `links/stage-1` (#56)", and that branch carries far more than stage 1.

## What the branch has

`origin/links/stage-1` (`ce7ff5b6`) is acme with a link-in-bio app on top: twelve things under
`examples/links/blueprint/things/`. Five are Plugged In's: `handle` (claim, release, resolve), `profile` (get), `link`
(add, order, remove), and the sign-in pair `person` and `session`. Six are acme's, copied in: `organization`,
`invitation`, `membership`, `api-key`, `system`, and the auth they need. Its `handle` is the app's own thing, not mounted
from `@orthograph/handles`, which does not exist yet. Its exits clash with K16 g: `HandleTaken` is exit 3
(`NotAllowed`'s), `HandleAlreadyOwned` and `LinkNeedsHandle` exit 4 (the generated `<Thing>NotFound`'s), and the
machines' `notFrom` is 5 on both things.

K9's stage 1 is profile, link and handle plus auth. M1.40's row narrows it further: stage 1 **without sign-in**,
declarations and empty handlers only; sign-in comes with ST1.04 and ST1.07, the handles plugin with ST1.03.

## The call

Take the three things and their values; leave everything else.

| From `links/stage-1` | In `examples/plugged-in` (M1.40) | Why |
|---|---|---|
| `handle`: claim, release, resolve | `handle`: **claim** only, the app's own thing | M1.40 names claim; release and resolve wait for ST1.03, which moves the claim into `@orthograph/handles` |
| `profile`: get | `profile`: **get**, created by the claim in the same commit | the public read of a page; K9's `on:` (M3.08) is not built, and one commit is truer than two calls |
| `link`: add, order, remove | `link`: **add, order, remove** | the row's list |
| `values/links.ts` | `values/page.ts`: `HandleName`, `LinkTitle`, `LinkUrl`, `LinkPosition` unchanged | they are right as written |
| `person`, `session`, the copied auth | none | no sign-in at M1.40 |
| `organization`, `invitation`, `membership`, `api-key`, `system` | none | acme's, not Plugged In's; acme stays the tests' fixture |
| `environments/staging.ts`, `production.ts`, `codex/links-staging` | `local` and `test` only | staging has no teardown step (X-pr56); the cloud is M7 |
| journeys, starting worlds, `src/` | none | M1.40 is declarations and empty handlers; journeys start from M1.45's stubs, handlers are M1.43 |

**Without sign-in, nobody owns anything yet.** Every operation is `allowed: [Blueprint.anyone]`, and a link names its
page by the handle's name in its payload (`plugged-in link add --handle aaron --title GitHub --url …`). Anyone can edit
any page until ST1.04 adds sign-in and the owner roles (`handleOwner`, `linkOwner`, as Codex wrote them). That is the
honest shape of "stage 1 without sign-in", and it keeps M1.41's loop to the basics K13 asked for.

**Exits follow K16 g (M1.47):** 5 to 125 (5 to 119 since [G3](G3-runtime-exits.md)), unique per thing including the machine's `notFrom`, and none of 0 to 4.

| Thing (code) | Refusal | Exit |
|---|---|---|
| `handle` (`HN`) | `HandleTaken`: the name is claimed | **10** |
| `handle` | the machine's `notFrom` | 11 |
| `profile` (`PR`) | `ProfileNotFound`: no page under that name (kept over the generated one, as acme's `AllowanceNotFound` is) | 20 |
| `link` (`LN`) | `LinkNeedsHandle`: `add` names a handle nobody claimed | 30 |
| `link` | the machine's `notFrom` (remove a removed link) | 31 |
| `link` | `LinkAlreadyRemoved`: `order` names a removed link (`order` moves nothing, so the machine doesn't check it) | 32 |

`HandleAlreadyOwned` goes: with no owner there is nothing to own twice; ST1.04 brings it back with sign-in.

## The shape M1.40 writes

```text
examples/plugged-in/
  blueprint/
    things/handle/{thing,machine,events,errors}.ts, verbs/claim.ts
    things/profile/{thing,errors}.ts, verbs/get.ts
    things/link/{thing,machine,events,errors}.ts, verbs/{add,order,remove}.ts
    values/page.ts
    environments/{local,test}.ts
    projections/  (model, api, server, sdk, cli, mcp, docs, portal: as acme mounts them)
  src/<thing>/<verb>.ts   empty handlers, scaffolded
  generated/              from `ortho generate`
```

`handle`: `claimed` only, `claim` from `[]`, emits `HandleClaimed { handle, name }`; idempotent by request.
`profile`: `{ id, handle, links }`, `links` the ordered link ids; no machine. `link`: `{ id, profile, title, url }`,
`listed` and `removed`, `add` from `[]` emits `LinkAdded`, `remove` from `listed` emits `LinkRemoved`; `order` moves
nothing and refuses a removed link with `LinkAlreadyRemoved`. Budgets `150 millis`, steps as Codex declared them.

**As built (M1.40, PR #84).** The machine's generated `notFrom` refusal for `link` is named `LinkNotListed` (exit 31),
and refusal names are project-wide, so `order`'s declared refusal is `LinkAlreadyRemoved` (exit 32), not the
`LinkNotListed` first written here. `prove --empty` now passes a project with no journeys yet (a non-empty run with none
still fails), since M1.40 has none until M1.45's stubs.

## Reversible

All of it is one folder. Release, resolve, sign-in and the owner roles are on `links/stage-1` for ST1.03 and ST1.04 to
take back word for word.
