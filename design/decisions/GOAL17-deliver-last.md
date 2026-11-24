# GOAL17-deliver-last: a stand-in delivers what it made last, and `again` needs no `of`

**Decided 24 November 2026** by Goal 16's checks author, under CX-takeover (Goal 17 is not running), for snag #933 on check 66.

## The problem

Four of check 66's journeys (`e2e/superagent/journeys/one-comment.ts`, `a-poll-after-sleep.ts`, `a-delivery-survives-a-kill.ts`,
`slack-door.ts`) named the comment or message they had made as `s.world.comment` or `s.world.ts`. `s.world` is only what the
starting world's `gives` returned (`packages/orthograph/src/modules/journeys/types.ts`, `Script.world`), and their world gives
`{ main, superagent }`. The comment is made inside the journey, so no world could give it, and `s.last` is gone after the next
step. Each journey failed on a correct build with `nothing at world.comment`. GOAL17-check-harness's own slice 10 example had the same flaw.

## The call

The stand-ins' `deliver` command, which slice 11 builds, takes an optional `of`:

- **With no `of`,** it sends the event of what the stand-in made last: GitHub's latest comment for `issue_comment`, Slack's latest
  message for `message` or `app_mention`. It is a new delivery, with a new delivery id.
- **`again: true`** re-sends the stand-in's last delivery as it was: the same delivery id, the same body, signed again unless
  `signed` says otherwise. It reads no `of`.
- **`signed`** is unchanged: `"wrongly"` or `"late"` applies to whatever is sent.

Options weighed: a step that keeps its answer under a name (`s.keep("comment", …)`, read as `s.kept.comment`) is a new script word
in `orthograph` and `prove` for one check's sake; the stand-in already knows what it made and sent. Echoing `of` in `deliver`'s answer
does not help, since `s.last` changes at every step.

Check 66 also gains a static test: every `s.world` value one of its journeys reads is a key its starting world's `gives` returns.

## Supersedes

- `design/decisions/GOAL17-check-harness.md`: "`again` re-sends the same delivery; `signed`" → "`of` may be left out, to send the event of what the stand-in made last, and `again` re-sends its last delivery as it was, with no `of`; `signed`"
- `design/decisions/GOAL17-check-harness.md`: "github.deliver({ event: \"issue_comment\", of: { comment: s.world.comment }, again: true })" → "github.deliver({ event: \"issue_comment\", again: true })"
- `design/decisions/GOAL17-check-harness.md`: "github.deliver({ event: \"issue_comment\", of: { comment: s.world.comment }, signed: \"wrongly\" })" → "github.deliver({ event: \"issue_comment\", signed: \"wrongly\" })"
