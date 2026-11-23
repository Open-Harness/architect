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

`internal/verify.ts` (the signature), `read.ts` (the body, the event's name, the handshake), `accept.ts` (the inbox row). Test: `inbound.test.ts`.
