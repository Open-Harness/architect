# inbound

`Inbound.handle`: the doors a generated Worker serves at `/_in/<mount>`, one for each adapter that receives events (M5-reach-out Q2;
built in Goal 17 slice 11, GOAL17-slice11-build). The adapter's `door` says how its sender signs and where the event's name is; the
mount says which events are included and the secret's name (`<MOUNT>_WEBHOOK_SIGNING`).

A request is judged in this order: a mount with no door is 404 and any method but POST 405; the signature is checked over the raw bytes
(GitHub's `X-Hub-Signature-256` and Slack's v0 with a five-minute window, both HMAC compared in constant time; or Bridge's RSA form below) and a bad one is 401 `{ _tag: "BadSignature" }` with nothing
written; a handshake (Slack's `url_verification`) is answered; an event the mount leaves out, one nobody knows, one that does not decode,
and, when the mount has sources, one that no active source and no operation's `on:` takes are each 200 `{ ignored: true }`; otherwise the delivery is one row of the journal, `id` `<mount>:<the
event's identity>` (unique, so one change settles once, however many deliveries or polls carry it), `operation` `in:<mount>`, in the
request's trace: 200 `{ accepted: true }` or `{ seen: true }`.

A `seen` is compared with the kept row on the event's object, which the adapter names beside its `id` (`AdapterEvent.object`: GitHub's
review or comment, Slack's message as a person wrote it), never on the envelope, and as values whatever their key order. One that differs
is still `seen` and leaves the kept row as it came, and its request's span tree holds `in.mismatch`, an error span whose `defect` names the
mount and the event's id, never the payload (M5-reach-out Q2.2, GOAL17-repeat-mismatch). A key on one side only is a difference: a
catch-up poll, when one lands, must compare only the fields both copies carry.

A door whose `verify` is `{ scheme: "rsa-pkcs1-sha256", header, within }` takes Bridge's signature (G16-adapter-mounts call 2,
#995 gap 5): the header is exactly `t=<ms>,v0=<padded base64>`, and `v0` is RSASSA-PKCS1-v1_5 (SHA-256) over
SHA256("<t>.<raw body>") under the public key whose PEM (SPKI, its body on one line or many, LF or CRLF) is the mount's
`<MOUNT>_WEBHOOK_SIGNING`. A `t` more than `within` seconds from the door's clock (Effect's `Clock`, which a world sets to its
own instant), either way, is refused; exactly `within` is taken. A key that is missing, not a PEM, not RSA or private refuses every
delivery, with the same 401. A `verify` with no `scheme` is HMAC, as before.

`internal/verify.ts` (the signature), `read.ts` (the body, the event's name, the handshake), `accept.ts` (the inbox row, and the kept one on
a repeat), `same.ts` (two objects compared as values). Test: `inbound.test.ts`, `rsa-door.test.ts`; e2e check 27.
