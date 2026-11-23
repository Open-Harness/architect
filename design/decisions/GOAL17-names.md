# GOAL17-names: one name for each operation and call the slice 5 checks found named twice

Decided 23 November 2026 by Goal 17's lead, before slice 5's build. The slice 5 checks author found six places where the
brief and the slice 2 records name one thing two ways, and picked none (`e2e/superagent/blueprint-names.ts`, `CONFLICTS`).

## The calls

1. **`eval.due`, not `evals.due`.**
   - **Why:** an operation is `<thing>.<verb>`, named from its path (`things/eval/verbs/due.ts`), and the thing is Eval.
     AGENTS.md: "Names come from paths and exported identifiers".
   - **Also needed:** a thing named `eval` makes the generated CLI write `const eval = …`, a syntax error in strict mode
     (found by the author's throwaway app). Slice 5's builder makes the CLI and SDK generators turn a reserved word into
     a safe identifier, keeping the operation's name `eval.due`. That is a framework fix, listed in slice 5's pull
     request.
2. **The Assignment's operations are its moves: `assignment.queued`, `promoted`, `started`, `cancelled`, `interrupted`
   and `turnEnded`.**
   - **Why:** the brief's table names its operations ("The operations are named here"). GOAL17-executor-slots' machine
     names its moves the same way. A verb is named as its move, as in every acme thing (`invitation/verbs/send.ts`, `move:
     machine.moves.send`).
   - **Replaced:** the record's prose `assignment.start` and `assignment.promote`.
3. **`assignment.waiting` is the one read `tickets` exports for `fill`.** It lists pending Assignments by `why`
   (person, then launch, then input), oldest first, and the record's journey reads it. The record's `assignment.list`
   was the same read under another name.
4. **`interrupted` is `from: ["running"]` only. A pending Assignment is `cancelled`.**
   - **Why:** the machine (GOAL17-executor-slots, its `moves`) and the brief ("`cancelled` (a pending one)") agree.
     "Where it stands" agrees too: `ticket.stop` picks `cancelled` or `interrupted` from the state it reads. Only the
     "Two writers" table said "pending or running".
5. **Slack's and PostHog's calls are named flat, as slice 3's rule and slice 4's adapters name them:**
   `slack.calls.chatPostMessage`, `slack.calls.conversationsReplies`, `slack.calls.usergroupsUsersList`,
   `posthog.calls.errorTrackingIssuesRetrieve`. GitHub's stay dotted (`github.calls.issues.createComment`), because its
   `operationId`s have a `/`. The code merged in #597 and #601 wins over GOAL17-source-from's sketch.
6. **PostHog's alert webhook events (`errorAlert`, `errorResolved`) are written by hand in the PostHog plugin, in slice
   11, as Slack's are in slice 4.** Its spec has no webhooks, so slice 3's `NEEDS.posthog.events` is `[]` and stays that
   way until then. Slice 11's author widens it, with the payloads PostHog documents.

Also from the checks author: Proposal and PromptSet share the refusal code prefix `PR-`, and Superagent and
Subscription share `SU-`. Slice 5's builder gives Proposal and Subscription an explicit code where the thing form takes
one.

## Evidence

- `e2e/superagent/needs.ts:20-27` (merged in #597): Slack's calls are `chatPostMessage` and `conversationsReplies`; PostHog's
  are `errorTrackingIssuesList`, `errorTrackingIssuesRetrieve` and `errorTrackingIssuesPartialUpdate`; PostHog's events are `[]`.
- `e2e/superagent/README.md:38-42`: the naming rule.
- `examples/acme/blueprint/things/invitation/machine.ts:7-11` and `verbs/send.ts:10`: a verb is named as its move.
- `design/decisions/GOAL17-executor-slots.md`, its machine: `interrupted: { from: ["running"], to: "closing" }`.

## Supersedes

- `design/goals/17-superagent.md`: "| `evals.due` (system, every 2 s;" → "| `eval.due` (system, every 2 s;"
- `design/goals/17-superagent.md`: "gate passes waits on its thread; `evals.due` batches" → "gate passes waits on its thread; `eval.due` batches"
- `design/goals/17-superagent.md`: "3. `evals.due` batches it." → "3. `eval.due` batches it."
