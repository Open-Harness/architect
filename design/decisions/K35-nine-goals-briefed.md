# K35: Goals 8 to 16 briefed, short, on the goal map

21 November 2026. Decided by the conductor under AGENTS.md, "Who decides", on Aaron's word that day. Asked whether to
brief the six goals that can start now, all nine planned goals, or a few he picked, he said: "all of them".

## The problem

The goal map (K34, `design/goals/map.md`) named Goals 8 to 16 as planned, with no brief, no branch and no milestone,
so no harness could start one. Goal 3's and Goal 5's briefs run to hundreds of lines; nine of those would take a day
to write and review, and most of their words would repeat `AGENTS.md`.

## The call

1. **Every planned goal gets a short brief**, `design/goals/<nn>-<name>.md`, in K33's shape: front matter the sync reads
   (`tools/github/sync.mjs`, in #301), the start line, the plain goal card, what to read first, a table of its slices
   (each a row of `design/milestones.md`, which wins), what it owns and the seams it touches, its done check, and one
   shared "How it runs" section that points at `AGENTS.md` and the skills rather than repeating them. Each ends with
   "Where it stands".
2. **Each has its own branch**, `goal/<name>`, cut from `goal/stage-1` and protected like it, so a slice Goal 3 has
   finished counts as landed for it (the map's rule), and each is `ready` on the map.
3. **Writing them corrected three things in `milestones.md`:**
   - **Goal 8 had no build slice.** M3.02 (the Effect bump) and M3.03 (the engine spike) were done, by #295 and #289,
     and nothing built `Blueprint.workflow`. Two new slices: M3.27 (its journeys and checks) and M3.28 (it, built on
     the engine, its waits through Goal 9's `Timers`). M3.02, M3.03 and M8.05 (#210) are marked ✅.
   - **ST3.06** (owners' signatures as a workflow) needed M3.03, the spike; it needs M3.28, the workflow built.
   - **ST4.05** (the budgets feature on Aztec) needed only ST4.04, but its done check runs the budgets journeys on
     Aztec, so it needs ST3.03 and ST3.05 too. Goal 14 runs its first four slices now, not all of them.
4. **Goal 9 owns `language-effect`'s `timers` module** and the `clock` module it adds; the rest of the engine stays Goal
   3's (the map's seam table).

## What it touches

| Dependent | Change |
|---|---|
| `design/goals/08-workflows.md` to `16-capxul.md` | new |
| `design/goals/map.md` | Goals 8 to 16 `ready`; Goal 8's slices; Goal 13's and Goal 14's needs; the `Timers` seam |
| `design/milestones.md` | M3.27 and M3.28 added and in Gate M3's needs; ST3.06's and ST4.05's needs; three slices ✅ |
| GitHub | once #301 is on `main`, the sync makes each goal's milestone, page and slices |

## Supersedes

- `design/milestones.md`: "ST3.05, M3.03, M6.15" → "ST3.05, M3.28, M6.15"
- `design/goals/map.md`: "none: ST4.01 reads the budgets declaration in `examples/budgets` (Goal 4)" → "ST4.01 to ST4.04: none, ST4.01 reading the budgets declaration in `examples/budgets` (Goal 4); ST4.05, and so ST4.06 to ST4.08: the budgets journeys and feature, ST3.03 and ST3.05 (Goal 13, K35)"
- `design/milestones.md`: "M3.16 to M3.26, M1.24" → "M3.16 to M3.28, M1.24"
- `design/milestones.md`: "| ST4.04 | build | the budgets journeys pass on Aztec" → "| ST4.04, ST3.03, ST3.05 (K35) | build | the budgets journeys pass on Aztec"
- `design/goals/map.md`: "and M3.03 (Goal 8)" → "and M3.28 (Goal 8)"
- `design/goals/map.md`: "| 1.0 | planned |" → "| 1.0 | ready |"
- `design/goals/map.md`: "ST2.03: ST1.01 and M6.15" → "ST2.03: ST1.25 (Goal 5) and M6.15"
