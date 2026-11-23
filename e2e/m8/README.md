# M8's checks: time

Written before any of M8 is built, by an author who builds none of it (`AGENTS.md`, "Journeys and checks come first").
They check K23 (`design/decisions/K23-time.md`) through the names and shapes `design/decisions/M8-checks.md` fixes where
K23 is silent. Every check is red on `main` today because time's surface does not exist, and each file says which slice
turns it green.

| Check | Slice it checks | What it proves | Fixture |
|---|---|---|---|
| `01-a-month-renews-once` | M8.02 | a membership renews once at the start plus a month, and not again fifteen days later; planted wrong journeys each fail their own step; moving the clock's start makes every operation stale | `fixtures/m8/renews` |
| `02-the-worlds-clock` | M8.03 | at each month of a year the server's clock, a time stored in the database, a `Timers` sleep and the chain's latest block read the world's instant; the follower's checkpoint too; Better Auth refuses a session after its life; a busy process makes a move `NeverQuiet`; a real clock refuses to move; `ortho check` refuses a stepped clock on staging | `fixtures/m8/probe`, `probe-control`, `real-clock`, `acme-stepped` |
| `03-moves-made-by-time` | M8.04 | `every` from a field across short months; calendar anchors on day 25 and the last day in London across the change to summer time; `after`, and leaving the state clears it; `lazy`; a renewal fired twice renews once; the keeper calls nothing else | `fixtures/m8/moves` |
| `04-time-declarations` | M8.04 | `ortho check` refuses bad time declarations, naming the move; the docs and MCP say when each move happens; the tenth eval, on time | `fixtures/m8/moves` |

M8.03's by-hand half and M8.04's adapter half need stage one's dev worlds and adapter packages; they are M8.18's.

## How they are built

- **Clubs.** Each fixture is laid over a copy of `examples/signup` (`support.ts` `club`): acme and the starter already
  have a `membership` thing of their own. `02` drives a world through its front door (`world.ts`), as `m1/13` does.
- **Literal instants.** Every instant and count a check expects is written in the check or the journey, never read back
  from the run. London's instants are worked out by hand in the journey's comment.
- **Un-gameable.** A journey passes only as `✔ n/n steps` (`passedWhole`). Planted copies of each journey, each wrong in
  one place, must fail at exactly that step, with every other step passing and nothing skipped (`failedAt`): a prove that
  marks steps passed without judging them fails here. A change prove cannot place (the clock's start) must make every
  operation stale.
- **One prove per club.** Each file proves its club once (`once`) and its tests read that run, so a run is minutes, not
  tens of minutes.

## Running them

```bash
pnpm nx run e2e:m8-ratchet
```

runs the ratchet's own unit test, then every check, then compares the failures with `expected-failing/` (one file per
check, the layout G9 gave M1; `../ratchet/README.md` says how the list works). It passes while every failure is listed.
`pnpm nx run e2e:m8` runs the checks alone, and is Gate M8's check once the list is empty.

When a slice lands and its checks pass, the ratchet prints `newly passing, take it off the list` for each: delete those
lines in the same pull request. `tools/ci/builder-paths.sh` lets a builder shrink every e2e suite's list, this one
included (CI-ratchet-suites), and refuses an added line or file.
