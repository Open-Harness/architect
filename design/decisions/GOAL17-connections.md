# GOAL17-connections: what makes one event, how Slack and PostHog name theirs, and the open points of slice 10's checks

Decided 23 November 2026 by Goal 17's lead, on the slice 10 author's report (PR #687, `e2e/superagent/README.md`, "What the builder
must make (slice 10)") and the hostile pass on its checks. It ratifies the README's eight points with the changes below, and settles
what the records disagreed on or left open. No call of Aaron's changes.

## The problem, in code

K40 fix 5 says one change to one object is one event, whether a door or a poll saw it; the brief's sketch and K40 write it two ways, and
neither can be computed by a poll, whose copy of a comment has no `action`:

```ts
// design/decisions/K40-superagent-gaps.md:218
id: (e) => `comment:${e.comment.id}:${e.action}:${e.comment.updated_at}`,
// design/goals/17-superagent.md:286, before this record
id: (e) => `comment:${e.comment.id}:${e.action}`,         // two edits of one comment are one event
```

Slack's `app_mention` and `message` arrive for one message with two envelope ids, and a retry carries a third. PostHog sends no
payload of its own to name an event by. If nobody decides, the door stores one comment twice, or one message twice, or never sees a
reopened error.

## The calls

- **A. GitHub identity.** An event's id is the object's kind, the repository's `full_name`, the object's own id (or number) and its own
  last-change time. There is no action and no delivery in it. Every object has the version, so an issue closed, reopened and closed is
  three events, and a poll's copy (no `action`, no `sender`) gives the door's id. The time is `updated_at`, or where an object has no
  such field its own: a review's `submitted_at`, a check run's `completed_at`. Check 61 judges that each of these changes the id and
  that nothing else does, never the string. It follows K40 fix 5's reasoning ("the object, and the object's own version").
- **B. Slack identity.** One message is one event: id is its channel and `ts`, whatever the envelope's `event_id`, its time, the retry or
  the event's kind. An `appMention` and a `message` for one `ts` therefore have one id, and the second is `seen`. Both mappings compute
  `addressed` from the text (`<@me.id>`), so whichever arrives first gives `addressed: "mention"` for a mention of me.
- **C. Slack subtypes.** A `file_share` and a `thread_broadcast` are people's messages and map. Every other subtype (`message_changed`,
  `message_deleted`, `bot_message`, `channel_join`...) is dropped, and so is any message with a `bot_id`. A message whose user is `me.id`
  is also dropped by the mapping, as well as by `trigger.receive`. A bot's message still has an actor, its `bot_id`, with `bot: true`.
- **D. PostHog identity.** The body our template writes gains a `timestamp`, and id is the issue's id, the kind and the timestamp, so a
  reopened issue is a new event. `errorResolved` stays as the design has it: our template writes the body. PostHog's docs mention alerts
  for "created or reopened" only, so it may never fire a resolve (see Open risks).
- **E. PostHog kinds.** `kinds` is `["errorIssue"]` only. No mapping makes an `alert`.
- **F. Sync.** `policyPart.sync` is judged: `needs.ts` lists `repos.listCollaborators` and `usergroupsUsersList`, their two fixtures are
  re-trimmed and re-pinned, and the stand-ins serve them (checks 04 and 05, 62).

## The README's eight points, ratified

| # | Point | Ratified as |
|---|---|---|
| 1 | an adapter's event has `id(e)` and `actor(e)`, pure functions of the payload | yes; `actor` is `{ id, name, bot }`, or `undefined` for no sender (PostHog) |
| 2 | the identity of a GitHub event | **replaced by A** |
| 3 | PostHog's alert body | yes, with a `timestamp` (D); `errorAlert` has `issue.status` `"active"`, `errorResolved` `"resolved"` |
| 4 | the doors: `/_in/<mount>`, the answers, the headers | yes; the event's identity settles a delivery, never `X-GitHub-Delivery` or Slack's `event_id` |
| 5 | the signing secret is the adapter's export `webhookSigning` (`GITHUB_WEBHOOK_SIGNING`) | yes |
| 6 | the four deferred refusals name file, error, `gone`, call, `me`, event, variable | yes, each on one problem line of the file the fault is in, with no stack trace |
| 7 | `plugins/intake/blueprint/sources/posthog.ts` exports `posthogSource` | yes |
| 8 | PostHog is active when its mount includes both events | yes; one included without the other, or the call its history reads missing, is refused naming the line to add |

Added: **9.** a GitHub history's `args` ask for a page size `per_page`, and `page(answer, cursor?)` answers `next` (the cursor plus one) when
the answer holds a full page; the cursor is the page number as text. **10.** The journeys of check 66 import their instruments as
GOAL17-check-harness fixes them: `github` and `slack` from `@orthograph/<mount>/stand`, `outbox` from `orthograph`.

## Open risks

- **PostHog may never send `errorResolved`.** Its documented alerts are created and reopened. If no destination can send a resolve, the
  `closed` hook never fires and a triage thread never closes by PostHog's word. A person's stop, or a pull request's merge, still ends the
  ticket. Slice 13's real run (Aaron's yes) finds out; until then the template is ours.
- **PostHog has no documented webhook signature,** so there is no door check for it, and none is written until a record says how the door
  verifies it.
- **An `updated_at` that moves without a change** (GitHub touching a comment) makes a second event for one comment. The mapping's
  trigger is stored by its own id, so the cost is one more trigger on a thread the gate already knows.
- **A review's and a check run's versions** (`submitted_at`, `completed_at`) are this record's choice; a check run that completes twice
  is two events, as it should be.

## Evidence

- `e2e/superagent/61-events-carry-ids-and-accounts.test.ts`, `62-the-mappings.test.ts`, `63-the-doors.test.ts`: the checks that judge A to D.
- K40 fix 5 (the object and its own version), GOAL17-source-from "How a door and a poll both feed it" (a poll and a door end in one
  `Inbox.accept`), docs.slack.dev "Verifying requests from Slack" (its worked example is check 60's), PostHog's alert docs (no payload,
  no resolve).

## Supersedes

- `design/goals/17-superagent.md`: "posthogSource({ project: "web", kinds: ["errorIssue", "alert"] })," → "posthogSource({ project: "web", kinds: ["errorIssue"] }),"
- `design/goals/17-superagent.md`: "id: (e) => `comment:${e.comment.id}:${e.action}`," → "id: (e) => `comment:${e.repository.full_name}:${e.comment.id}:${e.comment.updated_at}`,"
- `design/decisions/K40-superagent-gaps.md`: "`comment:${e.comment.id}:${e.action}:${e.comment.updated_at}`" → "`comment:${e.repository.full_name}:${e.comment.id}:${e.comment.updated_at}`"
- `design/decisions/GOAL17-source-from.md`: "message: (e) => e.subtype !== undefined" → "message: (e) => a subtype other than file_share and thread_broadcast"
- `design/decisions/GOAL17-source-from.md`: "Schema.Literals("errorIssue", "alert")" → "Schema.Literals("errorIssue")"
