# GOAL17-gate-no-sender: a message with no sender reads the unnamed cell, addressing or not

**Decided 24 November 2026** by Goal 16's checks author, under CX-takeover (Goal 17 is not running), settling #932's last
question on check 23.

## The question

GOAL17-stage-one call 8 says two things about a message with no sender that addresses the agent. Its prose says the
`unnamed` cell is "not on the list and not addressing (or has no sender)", so such a message reads `unnamed`. Its table's
row 7 says "not listed or no sender, not addressing", so it falls to row 8, `none`. The app's gate
(`examples/superagent/plugins/intake/src/modules/gate/service.ts`) and check 23's `reference` both read `unnamed`.

## The call

A message with no sender reads the row's `unnamed` cell whether it addresses the agent or not. Rows 3 to 5 judge a
person, and with no sender there is none. The `unnamed` cell is the one a service with no sender sets (PostHog's
`unnamed: "inferred"`), so row 8 would drop such an event however the row is set. The prose and the built gate already
say this, so nothing is rebuilt; check 23 now holds a case for each side and a planted gate for row 8's reading.

## Supersedes

- `design/decisions/GOAL17-stage-one.md`: "not listed or no sender, not addressing, on an `observed` row: the row's `unnamed` cell" → "not listed and not addressing, or no sender (addressing or not), on an `observed` row: the row's `unnamed` cell"
