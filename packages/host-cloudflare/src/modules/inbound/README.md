# inbound

`Inbound.handle`: the doors a generated Worker serves at `/_in/<mount>`, one for each adapter that receives events (M5-reach-out Q2;
built in Goal 17 slice 11, GOAL17-slice11-build). The adapter's `door` says how its sender signs and where the event's name is; the
mount says which events are included and the secret's name (`<MOUNT>_WEBHOOK_SIGNING`).

A request is judged in this order: a mount with no door is 404 and any method but POST 405; the signature is checked over the raw bytes
(constant time; GitHub's `X-Hub-Signature-256`, Slack's v0 with a five-minute window) and a bad one is 401 `{ _tag: "BadSignature" }` with nothing
written; a handshake (Slack's `url_verification`) is answered; an event the mount leaves out, one nobody knows, one that does not decode,
and one no active source takes are each 200 `{ ignored: true }`; otherwise the delivery is one row of the journal, `id` `<mount>:<the
event's identity>` (unique, so one change settles once, however many deliveries or polls carry it), `operation` `in:<mount>`, in the
request's trace: 200 `{ accepted: true }` or `{ seen: true }`.

A `seen` is compared with the kept row on the event's object, which the adapter names beside its `id` (`AdapterEvent.object`: GitHub's
review or comment, Slack's message as a person wrote it), never on the envelope, and as values whatever their key order. One that differs
is still `seen` and leaves the kept row as it came, and its request's span tree holds `in.mismatch`, an error span whose `defect` names the
mount and the event's id, never the payload (M5-reach-out Q2.2, GOAL17-repeat-mismatch).

`internal/verify.ts` (the signature), `read.ts` (the body, the event's name, the handshake), `accept.ts` (the inbox row, and the kept one on
a repeat), `same.ts` (two objects compared as values). Test: `inbound.test.ts`; e2e check 27.
