# M5-checks: what events in and out's checks assume where M5-reach-out is silent

Written 22 November 2026 by the ✍️ author of M5.02, before any of M5.03 or M5.04 is built. `M5-reach-out.md` decides the
door, `on:`, the principals, the outbox and the journey surface; the checks in `e2e/events/` need a few names and shapes
it leaves open. Each call here is the building agent's (`AGENTS.md`, "Who decides"); a builder that finds one wrong asks
the author, who changes the check and this record together. Where a call adds to M5-reach-out rather than filling a gap,
it says so.

## The problem, in code

A check must say how a sender is declared, what a door answers, how a journey reads a delivery, and how a check kills a
world in the middle of one. M5-reach-out says them in prose and a sketch (`design/decisions/M5-reach-out.md`, Q2 and
"What a journey can do"); a check needs the literal:

```ts
// M5-reach-out, Q2.1: "The adapter declares how its sender signs (`door: { verify }`: an HMAC scheme by header, prefix
// and tolerance, or the adapter's own verifier in its `src/`), where the event's id and type are, and its events as
// `Blueprint.event` schemas." No shape is given, and `AdapterSpec` has `events?: Readonly<Record<string, unknown>>` and no door:
// packages/orthograph/src/modules/plugins/types.ts:96-104
```

And a journey's `emits` reads one trace's journal, but an event that is delivered later is in no step's trace until the
step waits for it (`packages/prove/src/modules/journeys/internal/checks.ts:118`: `call.journal.find(...)`).

## The calls

1. **A fixture adapter, not a vendor.** `e2e/fixtures/events/bank` is a package, `@fixture/bank`, with two events and a
   door; `e2e/events/package.ts` builds it (esbuild to `dist/`, declarations best effort) and installs it in a project
   copy's `node_modules`, as `e2e/m1/packages.ts` does for its fixtures. It is hand-written stand-in code: no Stripe, no
   Resend, no key. An events-only adapter has no things and no calls. The real Stripe and Resend adapters are off the 1.0
   path; the notification fixture sends nothing, and records a delivery.

2. **How an adapter declares its door and its events, and how a mount reaches them.**

   ```ts
   // @fixture/bank/blueprint/events.ts: one export per event, named by its export
   export const checkoutCompleted = Blueprint.event({ reference: Blueprint.value(Blueprint.text({ max: 64 })), intent: Blueprint.value(Blueprint.text({ max: 64 })) });
   // @fixture/bank/blueprint/secrets.ts: frame/secrets.md, "Declaring one"; a world uses `test`; the name is BANK_SIGNING for a mount `bank`
   export const signing = Blueprint.secret.stored({ describe: "…", test: "whsec_bank_fixture_test" });
   // @fixture/bank/adapter.ts
   export default Blueprint.adapter({ description, choices: {}, events,
     door: Blueprint.door({ secret: signing, verify: Blueprint.door.hmac({ header: "bank-signature", scheme: "timestamped", tolerance: "5 minutes" }), id: "id", type: "type" }) });
   // blueprint/adapters/bank.ts: the mount's view gains `events`, as it has `calls`; `bank.events.<name>` is what `on:` and journeys take
   export default Blueprint.use(bank, (b) => [b.include(b.events.checkoutCompleted)]);
   ```

   `AdapterSpec` gains `door`; secrets stay declared by export. A mount that does not `include` an event still has it under
   `bank.events` (a journey may send it: that is the "left out" check), and the door answers it 200 and keeps nothing.

3. **The wire the fixture bank speaks, which the checks repeat by hand** (`e2e/events/door.ts`): the body is JSON
   `{ "id": "<event id>", "type": "<event name>", ...fields }` (the `id` and `type` names are the door's `id:` and `type:`;
   the event's fields are the rest); the header is `bank-signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`
   under the signing secret; a `t` more than five minutes from the door's clock, either way, is refused. A header that
   is missing, malformed or computed over anything else is refused.

4. **What the door answers, in bodies.** `POST /_in/<mount>`:
   - bad or stale signature: 401 `{ "_tag": "BadSignature" }` (`Blueprint.BadSignature` is exported like `Blueprint.NotAllowed`,
     so a journey writes `refuses(Blueprint.BadSignature)`); nothing written, and the event id is not used up;
   - accepted: 200 `{ "accepted": true }`; the same id again, whatever its fields: 200 `{ "seen": true }` (the first fields stand);
   - a type the mount leaves out, a type nobody knows, an included event that does not decode: 200 `{ "ignored": true }`;
   - an unknown mount: 404; a method other than POST: 405.
   - Spans, which journeys read with `spans(...)`: `in.<mount>` on every request, and one of `in.<mount>.accepted`,
     `.seen`, `.refused`, `.ignored` (the last also for an event that does not decode, with the defect on it). M5-reach-out
     Q2.2's `in.<mount>.refused` and `in.mismatch` are these names; the mismatch span stays the builder's to name.
   - The door continues the caller's `traceparent`, so a check that sends one reads the request's journal under that trace.
   - The inbox row: `id = "bank:<the sender's id>"`, `operation = "in:bank"`, `event` the event's name as the adapter exports
     it (`checkoutCompleted`), `subject` the sender's id (the bank names no other object), `fields` the decoded event fields.
     The delivery's own events are in the same trace (M5-reach-out, `settles`).

5. **`/_world/outbox`, adding to Q5.4.** Q5.4 says `{ pending, claimed, failed: [{ event, to, attempts, outcome }] }`. The
   checks read it as `pending` and `claimed` counts, `failed` the rows that ran out of attempts, and, **added here,**
   `refused: [{ event, to, attempts, outcome }]` for rows the operation refused (Q3.3 says they are kept with their tag; a
   check cannot tell "refused once" from "retried then lost" without reading them). `event` is the event's id (`evt_…`
   for ours, `bank:<id>` for a sender's); `to` is `op:<operation>` (Q1's `to` column); `outcome` the refusal's tag or the
   defect's first line. Rows to `home` are not listed. `POST /_world/outbox/redeliver` takes `{ event, to? }` and answers
   200 `{ redelivered: <rows set back to pending> }`. `ortho outbox redeliver` is that route's client; its check waits
   until dev worlds can be addressed from a check (see Snags).

6. **What the journey steps answer.**
   - `s.<mount>.sends(event, fields, { id?, signed? })`: the door's body (call 4), with the door's status in the step's
     record, so `expect((a) => a).toEqual({ accepted: true })` and `refuses(Blueprint.BadSignature)` both work. `signed` is
     `"wrongly"` (another secret) or `"late"` (the right secret, ten minutes before the world's now). A mount with a door
     is a member of `s` by its name; it needs no cast entry. Its journal is the inbox row's (so a repeat is `noEvents()`).
   - `s.world.settles()`: waits as M5-reach-out says, then answers `{ deliveries: [{ event, to, state }] }`: every row that
     reached a final state since the previous step, in `seq` order, `event` the event's name (`checkoutCompleted`,
     `InvitationSent`), `to` as in call 5, `state` `"delivered" | "refused" | "failed"`; rows to `home` are left out. Its
     journal is every entry written since the previous step finished, so `emits` and `noEvents` judge the deliveries'
     events; an empty outbox answers `{ deliveries: [] }` at once.
   - `s.world.redeliver(Event)`: sets back to `pending` every delivered or failed row of the last event of that name, and
     answers `{ redelivered: n }`; the step after it is a `settles`.
   - `calledBy(principal)`: the operation span of the step's call carries `principal.kind` (and `source` for a service).
     It lives in `packages/prove/src/modules/journeys/internal/checks.ts`, which a builder never edits: see Snags.

7. **Where a check kills a delivery, and which clock it runs on.** A check that kills a world cannot use `Worlds.start`
   (it wipes its folder and stops with its scope), so `e2e/events/world.ts` uses `Worlds.launch`: detached, its own
   process group, its state folder kept, its pid in a file. The check kills the whole group with `SIGKILL` by that pid
   (only the pid it started) and launches again on the same port and folder. The world's settings are bindings in the
   env file wrangler reads: `ORTHO_OUTBOX_LEASE=3 seconds` and `ORTHO_OUTBOX_BACKOFF=2 millis`, spans in the text form
   Goal 9's `ORTHO_KEEPER_DELAY` takes (M8-checks call 8). M5-reach-out Q1.6 says they are refused outside a world; a
   launched world is a world (`/_world/health` answers, its state folder is under `.ortho/`). Doubling from 2 ms the 15
   attempts take 2 ms * (2^14 - 1) = 32.766 s, which check 05 pins as at least 32 s: a fixed backoff fails it. Journeys
   run through `ortho prove` on the defaults, and need no retries.

8. **How the fixture notification fails and holds.** `notification.invite`'s handler asks a sender, `GET <SINK>/send?to=&cause=`,
   where `SINK` is a constant the check rewrites to a server it runs (`e2e/events/sink.ts`); any answer but 200 is
   `Effect.die`. The sender answers 200, 500, or holds the request: a held request is a delivery in the middle of its
   call, which is what a kill interrupts. The handler records the notification after the 200, so a delivery killed
   in the middle committed nothing and its retry sends again: the sender sees at least one request per delivery, the
   store holds exactly one notification keyed by the event's id (M5-reach-out, "Open risks": at least once outside, once inside).
   With `SINK` left as `"none"` (the journeys), the handler only records.

9. **Our own events' names in deliveries.** `to` for an operation's subscription is `op:<thing>.<verb>`
   (`op:notification.invite`), exactly as M5-reach-out Q1's table shows `op:<operation>`. A thing that lives as an actor is
   delivered the same way: its events come home first and reach `settles` as ordinary deliveries.

10. **What the compiler refuses, and what falls out.** `ortho check` refuses, naming the operation and the event: an `on:`
    whose `allowed` does not admit the deliverer (a person's role or `Blueprint.anyone` for a service's event, or the system
    for the bank's event), an `on:` naming an event the mount does not `include`, two `on:` of one operation taking one event,
    and a mount named `chain` (naming its file). An operation only the system or a service admits is left out of the SDK, the
    CLI and the MCP tools, and its docs page says "called by the system" or "called by the service `bank`", and names each event.

11. **The fixtures are laid over `examples/signup`**, as M8's are (the club); the control for the instrument is signup alone
    (`00-the-instrument`, true today). CI does not run the suite as a required job yet: `e2e:events-ratchet` is a target,
    not a workflow job, until M5.03's builder adds it (see the pull request).

## Snags (for the Goal 11 milestone)

- **`calledBy` is a generic step check in a protected file.** The judging lives in `checks.ts`, which `builder-paths.sh`
  protects. The author adds the judging (reading a `principal` the runner records on the call) once M5.03's builder has made
  the runner record it; until then every check that uses `calledBy` fails, which is the surface it is red for.
- **`ortho outbox redeliver` has no check yet.** A check of the command needs to address a dev world from a check; the route
  it calls is pinned (check 05). Asked of M5.04's author turn when it starts.

## What this adds to M5-reach-out

Call 5's `refused` list and `{ redelivered }` answer, call 6's `settles` answer, and call 4's bodies and span names. The
builder of M5.03 may name the mismatch span; every other name here is pinned by a check.

## Supersedes

Nothing: M5-reach-out's calls stand, and this adds what they left open.
