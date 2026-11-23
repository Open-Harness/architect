# time

Checks what a blueprint declares about time and turns it into model data: a machine move's `by`, `late` and `lazy`, and an
environment's `clock`. Every problem names its move (`membership.renew`) and its reason: an anchor field the thing lacks,
an anchor or `after` field that is not an instant, a calendar anchor with no zone, a zone the tz database does not know
(read through `Intl`, no dependency), a span that is not `"<n> <unit>"`, and `by` on a move that creates the thing
(M8-checks call 11). A blueprint that declares no time produces no time data at all, so its model is byte for byte what it
was. Test: `time.test.ts`.
