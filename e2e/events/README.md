# Events in and out: the checks

Written before M5.03 and M5.04 are built, by an author who builds none of it (`AGENTS.md`, "Journeys and checks come
first"). They check `design/decisions/M5-reach-out.md` through the names and shapes `design/decisions/M5-checks.md` fixes
where it is silent. Every check but the control is red on `goal/events` today because the door, `on:`, the principals and
the outbox do not exist, and each file says which slice turns it green.

| Check | Slice it checks | What it proves | Fixture |
|---|---|---|---|
| `00-the-instrument` | none (a control, true today) | a launched world keeps its state across a SIGKILL of its whole process group and a start on the same port, and leaves nothing running | `examples/signup` as it is |
| `01-events-in` | M5.03 | a signed `checkoutCompleted` settles a payment, called by `service(bank)`; the same event id again settles nothing and emits nothing; a bad or stale signature is refused 401 and does not use the id up; an event the mount leaves out is answered 200 and kept nowhere; an outsider calling `settle` is refused `NotAllowed`; a second event for a settled payment is delivered and refused by the machine, not retried; planted journeys each fail exactly their step | `fixtures/events/in` + `bank` |
| `02-the-outbox` | M5.04 (and M5.03) | our own `InvitationSent` is delivered through `on:` as `Blueprint.system`, once; `s.world.redeliver` changes nothing; a refused call writes no row and delivers nothing; an actor's event comes home and is delivered the same way; planted journeys each fail exactly their step | `fixtures/events/out` |
| `03-the-door` | M5.03 | hitting `/_in/bank` directly: the inbox row's id, operation and subject; every way to a bad signature (none, garbage, another secret, an hour old, an hour ahead, an altered body, an altered time) is 401 and writes nothing; an unknown type, an event the mount leaves out and one that does not decode are 200 `ignored`; five identical requests at once settle once; a repeat after a kill and a restart is still `seen`; a payment that does not exist is refused `PaymentNotFound` once; an unknown mount is 404 and a GET 405 | `fixtures/events/in` + `bank` |
| `04-on-declarations` | M5.03 | `ortho check` refuses an `on:` the deliverer is not admitted by, an `on:` of an event the mount leaves out, two `on:` of one event, and a mount named `chain`; what only the system or a service admits is left out of the SDK, CLI and MCP and its docs say what calls it | `in` + `bank`, `out` |
| `05-delivery` | M5.04 | a delivery that dies is retried 15 times with doubling backoff (at least 32 s from first to last), then shows as `failed` on `/_world/outbox` and redelivers with the route; killing the world mid-delivery delivers once after the restart, and still once two leases later; an actor's events killed before they come home deliver once each | `out`, a sender and a launched world |

## How they are built

- **Clubs.** Each fixture is laid over a copy of `examples/signup` (`support.ts` `club`), and the fixture bank,
  `fixtures/events/bank`, is built as a package and installed into the copy when it is needed (`package.ts`). The bank is
  hand-written: no real vendor, no key. Its signing secret is the test value its `blueprint/secrets.ts` declares.
- **Literal values.** Every status, body, count, name and instant a check expects is written in the check or the journey,
  never read back from the run. Event ids are the only things read from the world, and only to be compared with another
  place the world holds them (the notification's `cause`, the outbox's `event`, the journal's `id`).
- **Un-gameable.** A journey passes only as `✔ n/n steps` (`passedWhole`). Planted copies of each journey, each wrong in
  one place (`plants-in.ts`, `plants-out.ts`), must fail at exactly that step with every other step passing and nothing
  skipped (`failedAt`). The direct checks assert exact bodies and exact journals, each beside the case that must change
  nothing.
- **A world a check can kill.** `world.ts` launches a world (`Worlds.launch`: detached, its own process group, state kept),
  kills its group by the pid it started, and starts it again. `00` proves the instrument. `sink.ts` is the sender the
  notification asks: a real HTTP server the check runs, which answers, refuses or holds.
- **Real clock.** Until Goal 9's M8.07, the outbox runs on the real clock with `ORTHO_OUTBOX_LEASE` and
  `ORTHO_OUTBOX_BACKOFF` set in the world's env file (M5-checks call 7). Then they move to the world's stepped clock.

## Not covered here

- `ortho outbox redeliver` (the command): the route it calls is pinned in `05`; the command waits for a way to address a dev
  world from a check.
- Views (M5.05), workflows' waits (Q7), the chain follower's events: each is its own slice's check.
- The real Stripe and Resend adapters: off the 1.0 path.

## Running them

```bash
pnpm nx run e2e:events-ratchet
```

runs the ratchet's own unit test, then every check, then compares the failures with `expected-failing/` (one file per
check, as `../ratchet/README.md` says). It passes while every failure is listed. `pnpm nx run e2e:events` runs the checks
alone, and is the done check of M5.02's slices once the list is empty.

When a slice lands and its checks pass, the ratchet prints `newly passing, take it off the list` for each: delete those
lines in the same pull request. `tools/ci/builder-paths.sh` lets a builder only shrink `e2e/events/expected-failing/` (and
M1's), as its test shows.
