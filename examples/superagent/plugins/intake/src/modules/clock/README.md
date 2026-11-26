# clock

The superagent's active clock (GOAL17-pause): the wall clock less every moment it spent paused. `eval.delivered` records the active
clock when the main agent is told, and `eval.due` judges an eval overdue by it, so a pause moves an eval's deadline later by its length and
an eval that spans a pause does not expire because of it. While the superagent is paused the clock stands still. Pure: values in, a value out.

Test: `clock.test.ts`.
