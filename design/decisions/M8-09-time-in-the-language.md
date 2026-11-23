# M8.09: time in the language, and what the compiler does with it

Written 22 November 2026 by the 🔨 builder of M8.09 (Goal 9). K23 and `M8-checks.md` decide what time is; this records the
calls the build had to make where they were silent, each the building agent's (`AGENTS.md`, "Who decides").

## What was built

`orthograph` gains `Blueprint.time.every` and `.after` (a move's `by`), `late` and `lazy` beside it, `Blueprint.instant()`,
`Blueprint.keeper`, and `Blueprint.clock.real()/.stepped({ starts })/.scaled({ starts, speed? })` on an environment. The
compiler checks them and writes plain data into the model; the generators say when each move happens. Nothing runs: no
world clock, no keeper, no timers firing (M8.07, M8.10).

The model's shapes, as the M8.09 row fixes them:

```jsonc
// things.<t>.machine.moves.<m>
{ "from": ["active"], "to": ["active"], "emits": "MembershipRenewed",
  "by": { "kind": "every", "span": "1 month", "from": "startedAt" },   // or "on": { "day": 25 | "last" } | { "weekday": "friday" }, "zone": "Europe/London"
  "late": "10 minutes", "lazy": true }                                // both only when declared
// or "by": { "kind": "after", "field": "overdueAt", "span": "14 days" }
// environments.<e>.clock
{ "kind": "stepped", "starts": "2027-01-10T09:00:00.000Z" }           // or { "kind": "real" } | { "kind": "scaled", "starts": ..., "speed": 1 }
```

## The calls

1. **A model with no time is byte for byte what it was.** Every new key is written only when declared. Proved on `signup`,
   `acme`, `starter` and `work`: `ortho generate` from scratch before and after, `diff -r` empty (589 files).
2. **Only a move made by time is the keeper's.** The compiler refuses an operation whose move has a `by` unless it lists
   `Blueprint.keeper`, and one that lists the keeper whose move has none (K23 section 3: the keeper "can call only moves
   made by time"). This is an addition to the five refusals of M8-checks call 11.
3. **`NotAllowed` joins every operation's refusals once a blueprint has a keeper** (M8-checks call 4), so a journey can
   `refuses(Blueprint.NotAllowed)` on an operation open to `anyone`. A blueprint with no keeper is unchanged. The docs say
   why in that case: "the caller is the keeper, which calls only the moves time makes".
4. **`language-effect`'s `Access` knows the keeper principal** (`{ kind: "keeper" }`): it is allowed where listed and refused
   everywhere else, `anyone` and `signedIn` included. This is the only runtime behaviour added, and it is the rule, not
   the keeper.
5. **Journeys type-check `s.clock` and `s.keeper`, and `prove` refuses to run them.** A clock step, or a call made as the
   keeper, stops the journey with "time is not built yet: M8.07" or "M8.10". Nothing is faked.
6. **`ortho check` prints each compile problem** under "the blueprint doesn't compile", so a refusal names its move wherever
   it is read (M8-checks call 11). Before, it printed only that the blueprint did not compile.
7. **A zone is a tz database name** (read through `Intl.supportedValuesOf("timeZone")`, plus `UTC`; no dependency) **or a
   text field of the thing.** A path through another thing (`"company.zone"`) is not read yet: it is refused naming the zone.
7b. **The tz list is what `Intl.supportedValuesOf("timeZone")` gives, plus `UTC`.** That is the canonical names, so a link such as `US/Pacific` or `Etc/UTC` is refused (use `America/Los_Angeles`, `UTC`), and the list depends on the Node ICU build the compiler runs on. A zone the build does not list is a problem naming the move and the zone, never a silent guess.
8. **A clock's `starts` is normalised** to ISO 8601 with milliseconds in the model, as every instant is on the wire.
9. **A cast member may be named `clock`; `world`, `last` and `step` are refused.** Those four are the script's own words,
   and a cast member of the same name used to be overwritten without a word (a Codex finding on #517). The compiler now
   refuses a cast named `world`, `last` or `step` in a journey or a starting world, naming the clash. `clock` stays
   allowed because a check on `goal/stage-1` already casts it:
   `e2e/fixtures/m1/service-caller/blueprint/journeys/a-service-is-nobody-signed-in.ts:17` has
   `clock: Blueprint.system` and calls `s.clock.run(tick, {})`, and a builder never edits a check. So a cast member
   named `clock` keeps its `run`, `person`, `email` and `password`, and gains the world's `advance` and `moveTo`, which
   no actor has. One name then means "whoever acts on time" in both uses.

## Supersedes

None: nothing earlier said otherwise.
