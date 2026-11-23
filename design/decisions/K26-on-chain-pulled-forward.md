# K26: on chain, pulled forward

Decided 20 November 2026 by Aaron. The conductor relayed his words in the brief that started the 📐 on-chain designer
session the same day (the session's transcript; the brief is not in the repository):
"the solidity thing in and of itself, like how you go from blueprint to like the whole, through the whole life cycle,
deployed on a chain and whatnot, what the abstractions are called, how they work. That whole thing is kind of a black
hole ... I want to ... work on the DX of how it's supposed to look ... work on the flow of it a bit, and then we're
gonna go and build it." His product reason is Capxul Next (companies, authority, budgets, pay, Safe accounts on chain),
which is being redrawn on Orthograph and needs the chain half to exist.

## The rule it is an exception to

```text
AGENTS.md, "How work flows": Nothing in a milestone starts until the previous milestone's gate passes on `main`.
design/milestones.md, the stage table: M6.01 (stage 2's chain decision) | Gate M5 | read as Gate M2
```

Under the stages (K9), on-chain work waits for stage 1's gate (Gate M2) and is then spread across stages 2 and 3.
Aaron is bringing it forward, so it starts while stage 1 is still being climbed on `goal/stage-1`.

## Decided

1. **The on-chain design starts now.** M6.01 (the chain decision) no longer waits for any gate. It is worked with
   Aaron in a 📐 Designer thread and recorded as decisions as they land. The first is
   [K25](K25-the-blueprint-on-chain.md), the blueprint on chain (pull request #218, merged before this one).
2. **Building follows the design, slice by slice,** each when its own `needs` are met, without waiting for the stage 2
   or stage 3 gate. Checks come first, as always: an author writes the failing checks, and a builder makes them pass.
3. **What is not pulled forward:** the gates themselves. Each gate's suite still runs and still has to pass where the
   stages put it. A slice pulled forward that touches a gate's suite counts toward that gate when it comes.
4. **Its own goal branch, beside Goal 3.** Aaron, later the same day: "What if we were to re-cut the main goal and
   take ownership over the engine? ... how can we make this one proper goal that completes something end to end
   properly?", and then "Both parts". So the on-chain work runs as one goal on its own branch, `goal/on-chain`, cut
   from `goal/stage-1`:
   - It may change the engine (`packages/orthograph`, `compiler`, `generators`, `projections`, `language-effect`)
     on that branch.
   - It merges `goal/stage-1` in at the start of every slice, and never pushes to it except through the one pull
     request below. Goal 3 never waits on it, and the on-chain goal resolves every conflict.
   - Authors' work (journeys and checks) arrives on `-check` branches merged into `goal/on-chain`, and builders never
     edit it, as in `AGENTS.md`.
   - It lands in `main` once stage 1 has. If Goal 3 is still open when it finishes, it lands in `goal/stage-1`
     through one pull request.
   - It is local only: no cloud and no keys.
5. **This is Aaron's exception, not a new rule.** (_Superseded by K34, 21 November 2026: every goal now starts a slice once what it needs has landed, in any milestone order; see `design/decisions/K34-goals-by-needs.md` on `main`._) Any other milestone still waits for its gate unless Aaron pulls it
   forward in the same way, with his words recorded.

## What it touches

| Dependent | Change |
|---|---|
| `design/milestones.md`, the table of slices whose `needs` names an old gate | M6.01 is read as "none: started 20 November 2026 (K26, Aaron's exception)" |
| M6.02, M6.07, M6.09 and M6.10 to M6.18 (stage 2 and 3's chain slices: the journeys, the relayer, the follower, the contracts and the key checks) | may start once their own `needs` are met, on the on-chain goal's branch (item 4), before the stage 2 or 3 gate |
| M6.21 (moves made by time in Solidity) | not freed: it also needs M8.09, the time work, which is not pulled forward |
| `AGENTS.md`, "How work flows" | one line points here, so the gate rule there names its exception |
| K9, "The order after workable" (a dated record) | a dated note beside stage 3 points here |
| The kanban board (`.agents/skills/kanban/data/`, `STATE.md`) | not edited by hand: its saved files are snapshots of the live board, which the conductor updates and saves again |
| Goal 3 on `goal/stage-1` | never waits: the on-chain goal merges it in at every slice (item 4) |

## Supersedes

- design/milestones.md (the stage table): "| M6.01 (stage 2's chain decision) | Gate M5 | Gate M2 |" → "| M6.01 (stage 2's chain decision) | Gate M5 | none: started 20 November 2026 (K26, Aaron's exception) |"
