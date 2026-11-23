# gate

How strongly one event asks the superagent to act, and why: the prototype's `002` table (GOAL17-stage-one, calls 7 and 8).
`gate.of(trigger, thread, tickets, policy)` is pure; `trigger.receive` reads the records into the views of `types.ts` and keeps
the trigger when the strength is not `none`.

Top first, first match wins: a bot (on the list and addressing the agent, or on a row that sees every message: inferred), a listed
person addressing the agent (explicit), a person on a thread a ticket follows (explicit if listed, else inferred), a stranger
addressing the agent (the row's `unlisted` cell), a listed person's plain message (`listed`), anyone else's (`unnamed`).
Then `off` turns every inferred into none.

Test: `gate.test.ts`. `e2e/superagent/23-the-gate.test.ts` judges every cell.
