# stage

The ticket stage table (the prototype's `003`, GOAL17-derived-reads): who a ticket waits for, and why, worked out from its
newest Report, Assignment, Attention and Inputs, top row first. Pure: `stageOf` is the `is` of `ticket.stage` and
`ticket.waiting`'s derive. Two tables are put in order by the `seq` each record stored, never by a clock or a row id.
Test: `stage.test.ts`, one case for each row.
