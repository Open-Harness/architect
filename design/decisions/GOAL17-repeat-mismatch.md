# GOAL17-repeat-mismatch: what a repeat delivery is compared on

**Decided 24 November 2026** by Goal 16's checks author, under CX-takeover (Goal 17 is not running), for snag #901 and check 27.

## The question

M5-reach-out Q2.2 (on `main`; `goal/superagent` does not carry the file) says: "A `seen` whose fields differ from the kept ones is a
defect on the span (`in.mismatch`), never silent." The door
built in #747 never compares, so an edited GitHub review, which keeps its `submitted_at` and so its id (GOAL17-connections A), is answered
`seen` and the edit is lost without a trace. Q2.2 does not say which fields. Check 63 calls several repeats one event: another delivery
id, another sender, another installation, the edit event of a comment at the same change time, and one Slack message delivered as a
`message` and as an `app_mention`.

## The call

A repeat is compared on the event's **object**, never on what the service wraps around it:

- **GitHub:** the object the identity names: the review, the comment, the issue, the pull request, the check run. `action`, `sender`,
  `installation`, `changes` and the delivery are not compared.
- **Slack:** the message as a person wrote it: its user, channel, text, `ts` and thread. The envelope (`event_id`, `event_time`, a retry)
  and the event's `type` and kind-only fields (`channel_type`, `event_ts`) are not.

A repeat whose object differs is still answered `seen`, writes nothing and keeps the first row, and its request's span tree holds a
span `in.mismatch` with its `defect` attribute set (a sentence naming the mount and the event's id, never the payload), as every defect on a
span is written, so trace trees and `watch` show it as one. Where the object lives is the adapter's to say (beside its `id`), so the door compares without knowing GitHub or Slack.

The whole object is compared, not its body alone: the same review sent again with another `state` is a mismatch. A `dismissed` review
never reaches the comparison today, because the GitHub adapter does not take that action and the door answers `ignored`. If it ever
takes it, the dismissal keeps the review's id and is recorded as `in.mismatch`: that is Q2.2 working as written, not a fault in the door.

Making an edited review a new event was weighed and not chosen: GOAL17-connections A fixes the review's version as `submitted_at`, and
check 61 judges that nothing else changes the id. If reviews must see edits, that is a change to call A, not to the door.

## Supersedes

Nothing: Q2.2 is kept as written, and this says which fields it compares.
