# events

`Inboxes`: the host's binding of orthograph's `Inbox` (`orthograph/server`), the one entry for outside events
([`design/decisions/CX-events-in.md`](../../../../../design/decisions/CX-events-in.md), following M5-reach-out Q2). `Inboxes.sink(inbox, { name })` is the
follower's sink (`FollowerSink.accept`'s shape): it answers as soon as the inbox has settled the entry and written its deliveries, then runs the
inbox's pass as counted work and sets the next pass with `Timers.at(next, "events/inbox/<name>", "pass", …)`, `name` being the inbox's identity. A hop never holds the follower.

Built by E1's builder (#1165); until then only its check is here. Test: `events.test.ts`.
