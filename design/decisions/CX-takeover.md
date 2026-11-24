# CX-takeover: Goal 16 takes the items waiting on the claude-led goals

**Decided 24 November 2026** by Goal 16's lead, under Aaron's say-so, relayed by the conductor of Goal 16's Space
(thread T-01a2093c-2b96-76f0-917b-43d5cfea3710): "I don't think any Claude threads are running. So if you're waiting on
something from a Claude thread, take it into your own bowl and do it yourself."

## Which goals are not running

A goal whose lead ran in Claude (Claude Code) and that shows no live activity is treated as not running. Read from each
brief's `lead.harness` and `status`, the goal branches' last commits and the open pull requests, at 12:15 UTC:

| Goal | Lead | Brief's status | Last activity | Reading |
|---|---|---|---|---|
| 3, stage one | claude-code | parked | `goal/stage-1`, 23 November 19:03 | not running |
| 4, on-chain | claude | parked | `goal/on-chain`, 23 November 17:24 | not running |
| 5, UI layer | claude | parked | `goal/ui-layer`, 23 November 06:30 | not running |
| 9, time | claude | parked | `goal/time`, 23 November 18:26 | not running |
| 12, wallets | claude | parked | `goal/wallets`, 23 November 16:27 | not running |
| 14, club | claude | parked | `goal/club`, 23 November 17:08 | not running |
| 17, superagent | claude (its brief on `goal/superagent`; `main`'s older copy says `null`) | running (on `goal/superagent`; `ready` on `main`) | `goal/superagent`, 24 November 00:25; #781 (draft) 03:09 | not running |
| 18, framework | claude | running | #909 and #910 (open), 24 November 05:40 and 07:12 | not running |

Goal 7 (Claude lead, Codex builder) is done. Goals 16 and 19 run in Amp.

## What Goal 16 takes

Each is claimed by `lane:goal-16` on its issue and a Touches line, and by the lane on its row in `docs/canon/status.md`.

- **#764, `Records.list`** (row `gap-records-list`). Touches `packages/language-effect/src/modules/records/`.
- **#759, a check on extra writes.** Touches `packages/language-effect/src/modules/handler/` (the written rows on the
  commit span), `packages/prove/src/modules/evals/` and the examples that write things they don't declare.
- **#920, a batched unique check.** Touches `packages/language-effect/src/modules/records/internal/holder.ts`, `Store`
  and its sqlite and D1 implementations (`packages/host-cloudflare/src/modules/store/`).
- **#742, items 1 to 5 and 7** (rows `gap-optional-columns`, `gap-wide-things`, `gap-books-value-types`).
  - Items 1 to 3 are built on `goal/superagent` by #756 but not in `main`. Goal 16 lands them into `main` from there
    (K38), rather than building them again, and checks whether integers, not only booleans, round-trip.
  - Item 4 touches `packages/host-cloudflare/src/modules/store/` and `packages/compiler/`.
  - Item 5 touches `packages/orthograph/src/modules/values/`. Calendar days are built (#917). Signed money exists
    (`Blueprint.money(asset, { signed })`). Exact decimals, optional fields and optional references remain.
  - Item 7 touches `packages/compiler/src/modules/model/internal/allowed.ts`.
- **#742 item 6 and #767**, a role path that walks to nothing (row `gap-company-roles`). Touches
  `packages/compiler/src/modules/model/internal/allowed.ts`.
- **#739, the adapter generator** (row `adapters-from-spec`). It exists only on `goal/superagent`, so Goal 16 builds
  its five gaps there, and lands the generator into `main` with them.
- **#749, Capxul's rows.** Goal 18 closed it after #791, so Goal 16 keeps Capxul's rows in `docs/canon/status.md` from
  now on.

Goal 17's claim #758 keeps everything else it names. Goal 16 takes the two parts of it the items above need:
`packages/language-effect/src/modules/{handler,records}/` and `packages/prove/src/modules/journeys/`.

## The overlaps with Goal 17's claims

Settling two lanes' overlaps is the framework goal's job (K42, section 3), and Goal 18 isn't running, so Goal 16 settles
these under the same delegation:

- **`webhook-doors` (Goal 17) and Goal 16's rows on `packages/host-cloudflare/src/modules/store`.** Goal 16 changes
  only the store's columns, rows and list and unique queries. The doors' own module, `inbound/`, stays Goal 17's, and
  with Goal 17 not running nothing edits the store from both lanes at once. A goal that restarts Goal 17 asks Goal 16
  before touching the store.
- **`adapters-from-spec` and Goal 17's superagent rows on `examples/superagent/plugins`.** Goal 16 takes only the
  generator, `packages/cli` and `packages/generators`, so that path leaves the row's Touches. The superagent's plugins
  stay Goal 17's.

## What an unset `writes` means

#759 found two meanings in the compiler. `model/internal/stores.ts` reads a `database` step with no `writes` as writing
the operation's own thing. `model/internal/invariants.ts` calls it unknown, though it only ever applies that to the
operation's own thing.

**The call:** a `database` step with no `writes` writes the operation's own thing and nothing else. `writes: []` is
reads only. A step that writes any other thing names it, as `handle.claim` already does. This was Goal 18's call; Goal
16's lead makes it under Aaron's delegation.

Why this one: it is the meaning `stores.ts` already enforces for stores, and the only one under which #759's check can
name an extra row. The examples that write another thing without naming it (`invitation.accept` and
`organization.create` in acme and starter, `link.add`, `link.remove` and `link.order` in plugged-in) declare it. That changes acme's
model, so it lands as a G12 pair, with #759's checks.

## Supersedes

- `docs/canon/status.md`: "the five generator gaps in #739, which Goal 17 builds" → "the five generator gaps in #739, which Goal 16 now builds"

`invariants.ts`'s comment and #759's eval change with the build.
