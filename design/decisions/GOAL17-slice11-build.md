# GOAL17-slice11-build: what slice 11 built, the doors, and the forms it added

Decided 23 November 2026 by the building agent (🔨 builder of Goal 17, slice 11), on `goal-17/s11-connections-build`. It builds the
connections to slice 10's checks (`e2e/superagent/60` to `66`, GOAL17-connections). Under K39 call 6 and K42, this integration branch
builds what it needs of Goal 11's M5.03 (the webhook doors) to M5's design (`M5-reach-out.md` Q2, `M5-checks.md` call 4), and says so
here: **the doors built below are Goal 17's copy of M5.03's door, not Goal 11's.** Goal 11's own inbox, outbox and `on:` are not built;
the door writes the inbox row and answers, and the hop from the row to `trigger.receive` is slice 7's and 9's.

## What was built, against M5's design

| M5 says | Built here |
|---|---|
| Q2.1 a door per adapter mount at `/_in/<mount>`, the adapter declares how its sender signs (`door: { verify }`), where the event's name is, its events | `AdapterSpec.door` (`AdapterDoor`): `signing`, `verify` (header, prefix, `signs` the body or `<version>:<timestamp>:<body>`, a timestamp window), `event` (a header or a path in the body), `challenge`, `envelope`. GitHub's and Slack's are in their `src/written.ts`; PostHog has none (no documented signature) |
| Q2.1 the secret is the adapter's declared signing secret | `export const webhookSigning = Blueprint.secret.stored()` in the adapter; in an environment it is `<MOUNT>_WEBHOOK_SIGNING`, in the model as `mounts.<name>.door.secret` |
| Q2.2 bad or stale signature 401, nothing written; unknown type, unknown event, an event that does not decode: 200 ignored; else accept: 200 accepted or seen | `packages/host-cloudflare/src/modules/inbound` (`Inbound.handle`). The signature is compared by `crypto.subtle.verify` (constant time) over the raw bytes. A delivery no active source of the mount takes (a comment deleted, an issue labeled) is `ignored` too |
| Q2.3 the inbox is the journal: `id = "<source>:<the sender's id>"`, `operation = "in:<source>"`, one batch | one `_journal` row with `id` `<mount>:<the event's identity>` (GOAL17-connections A, B, D: the object and its own version, never `X-GitHub-Delivery` or Slack's `event_id`), a unique index on `id`, the trace of the request, and the sender's `actor`. A door-enabled app's migration gains the `id` and `actor` columns; an app without doors generates byte for byte as before |
| M5-checks call 4 spans | `in.<mount>`, and `in.<mount>.accepted`, `.seen`, `.refused`, `.ignored` |

Not built: the outbox, `Blueprint.on`, `settles`, `/_world/outbox`, `Inbox.accept` for the chain follower and the poll. The poll's
entry (`catchUp`) and the hop to `trigger.receive` are slice 7's and 9's.

## The new public forms and calls

| Where | Form |
|---|---|
| `orthograph` | `Blueprint.incoming(schema, { id, actor })` (the second argument is new); `AdapterEvent.id` and `.actor`; types `EventIdentity`, `EventActor`, `AdapterDoor`; `AdapterSpec.door` |
| `orthograph` sources | `History.page(answer, cursor?)` takes the cursor it was asked for |
| `compiler` | `mounts.<name>.door = { secret }` when the adapter has a door and the mount includes an event; `sources.<name>.file` and `.export` (so the Worker can import the kind); four refusals, each on one problem line: a `reply.gone` error the reply call does not declare (naming the error, `gone` and the call), a `config` with no `me` of `{ id: string, login: string }`, an `environment.of` whose keys are not `variables`' names (naming the key), and a connection naming an event no kind of its source makes (a connection lists a kind, `comment`, or its group, `comments`) |
| `generators` | the generated adapter descriptor spreads `door` from `written.ts`, which the scaffold exports (`door: AdapterDoor | undefined`) |
| `projections` | the generated Worker serves `/_in/` where a mount has a door, imports each source kind that maps the mount, and types the secrets in `Env`; the migration adds the inbox columns only then |
| `host-cloudflare` | `Inbound.handle`, the module above |

## Calls the builder made

1. **GitHub's `installation`, `organization` and `enterprise`** are `envelope`: left out when the event is judged, kept in the stored
   fields. The spec requires `node_id` inside `installation`, and a redelivery with a short one (check 63) must still be `seen`.
2. **A mapping that fails** takes its delivery (the inbox keeps it) rather than losing it.
3. **`policyPart.sync` has no arguments of its own yet**: what the call is asked (a repository, a user group) is read by slice 7's handler
   from the connection and the policy, as the record leaves open.
4. **Held plugins are regenerated** from the committed fixtures with `ortho new adapter`, and GitHub's identity is said again in
   `src/written.ts` (the generated descriptor spreads it last), so no generated file was edited.
5. **PostHog's door** does not exist: no documented signature (GOAL17-connections, open risks).
6. **Migration 0001 was edited in place** (the inbox columns), because the superagent has never been deployed; adding a door to a deployed app needs a 0002 migration (`design/later.md`).

## Not done

- Check 66 (the five journeys) waits on GOAL17-check-harness's instruments (slice 9) and stays on `expected-failing/`.
- The outbox hop, the account on the caller (`account.seen`) and the poll (`catchUp`): slices 7 and 9.
- Environments (`ortho env up`) do not yet list a door's secret among the secrets they ask for; a world takes it by `secretEnv`.

## Supersedes

- `design/decisions/GOAL17-source-from.md`: "page: (r) => ({ messages: r.data.map" → "page: (answer, cursor) => ({ messages: comments.map"
