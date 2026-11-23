# M6-relayer-rebroadcast: the relayer sends a dropped transaction again, and does not replace it

23 November 2026. Goal 4, slice 9 (M6.07). Decided by the conductor under Aaron's standing authority of 21 November 2026 ("be independent and
autonomous"; `AGENTS.md`, "Who decides"), not by Aaron himself.

## The call

The conductor's words, on `goal-4/m607-build` at head 8e131c2b: "The conductor's call, under Aaron's standing authority (not Aaron's own word),
is to cut fee-bump replacement out of this slice." The relayer sends a transaction the node dropped again, the same signed bytes, and never signs
a replacement at a higher fee.

## Why

Five review rounds on the relayer (8e2c0cc7, d4415bc8, 5e4c2e40, 1428843e, 8e131c2b) each found a valid nonce fault, and every one had the same
cause: the relayer and `chain-evm`'s port each owned a piece of one nonce's state (the relayer's store rows, the port's reservation and its
broadcast), and the relayer kept them in step by guessing what the port knew. A replacement is where the guess is worst, because it needs the
port to hold a broadcast at that nonce, and the port decides that when it reads the head, sends and refuses, none of which the relayer sees. Round
5's last fault was the plainest: a failure to read the head before the broadcast was answered as sent, the alarm then asked for a replacement of a
transaction the port had never broadcast, and the call was lost.

A rebroadcast needs no such knowledge. Sending the same signed bytes again is safe at any moment: `submit` answers "already known" and a nonce
used by the same hash as success, and registers the broadcast when it never got to. So the relayer asks the port only whether the node holds the
transaction, and sends it again if it does not. The two other owners stay: the row owns its nonce from the moment it is taken, and the port alone
says whether a refusal is final (`isDefinite`).

## Refused calls

A call refused while it is being relayed becomes a fill, and its caller gets the error. A rebroadcast that is refused keeps the call: the node can
refuse a rebroadcast only on its pool checks (a short balance, a fee below the floor, since `submit` does not simulate), and those can clear. So
the row keeps its bytes and its reservation, notes the reason once, and is sent again at the next alarm, at the alarm's normal interval; a row stuck
that way shows in `health()` past its deadline. (A fresh broadcast the node refuses for good resets the entry to a plain held reservation with
`keepOnReject`, and the next send of the same bytes registers it again.)

## What the cut costs

Without a fee bump, a transaction sent too cheap during a fee spike stays stuck, and every nonce behind it waits. The cost is not hidden:
`Relayer.health()` names each nonce pending past `stuckAfterMs` (default ten minutes, from `configure`), with the row id and how long it has been
pending, read from the Clock. Fee-bump replacement is the first entry for the relayer in `design/later.md`, as its own slice in which the port
owns the whole lifecycle (begin, broadcast, refuse, replace) and the relayer never infers it.

## What changes

- The relayer's resend and replace path, its fee cap, and its cancel-versus-speed-up choice are gone. A row's hash never changes, so `status`'s
  `replaces` is always empty and `reconcile`'s `replaced` is always empty; `reconcile` also answers `rebroadcast`, what it sent again.
- `chain-evm`'s port keeps `replace` (with its guard that only the transaction broadcast at a nonce can be replaced). Its own tests and its
  public surface use it; the relayer does not.
- `e2e/on-chain/10-m6-07-relayer.test.ts`: its two replacement cases ("reconcile, called, replaces what the node dropped, ..." and "replaces a
  dropped transaction on its own, through its alarm") stay on `e2e/on-chain/expected-failing/10-m6-07-relayer.txt`; the other five come off.
  The slice meets its gate with those two parked, which is a scope cut and not a pass of the original M6.07 check.

## Supersedes

- design/decisions/M6-chain.md: "The relayer replaces a dropped transaction on its own." → "The relayer rebroadcasts a dropped transaction on its own."
- design/decisions/M6-chain.md: "and resends it at the same nonce with a higher fee" → "and sends the same signed bytes again"
- design/build-plan.md: "nonces handed out in order, stuck transactions replaced, receipts written through." → "nonces handed out in order, dropped transactions rebroadcast, receipts written through."
- design/build-plan.md: "A dropped transaction is replaced with a higher fee. |" → "A dropped transaction is rebroadcast; replacing it with a higher fee is later (`design/later.md`). |"
- design/milestones.md: "| M6.07 | The relayer actor (L3.06) | M1.31 | build | 100 concurrent submissions, nonces 0 to 99, a dropped one replaced | M |" → "| M6.07 | The relayer actor (L3.06) | M1.31 | build | 100 concurrent submissions, nonces 0 to 99, a dropped one rebroadcast (replacing it with a higher fee is later) | M |"
- design/frame/examples/allowance-on-chain.md: "| relayer | relayer key | hands out nonces in order, replaces stuck transactions, writes receipts through | L3.06 |" → "| relayer | relayer key | hands out nonces in order, rebroadcasts dropped transactions, writes receipts through | L3.06 |"
- design/goals/04-on-chain.md: "wraps `chain-evm`'s nonce allocator, transaction manager, replacement and tracker (adapted from" → "wraps `chain-evm`'s nonce allocator, transaction manager, rebroadcast and tracker (adapted from"
- .agents/skills/kanban/data/tasks.json: "\"doneWhen\": \"100 concurrent submissions, nonces 0 to 99, a dropped one replaced\"" → "\"doneWhen\": \"100 concurrent submissions, nonces 0 to 99, a dropped one rebroadcast (replacing it with a higher fee is later)\""
- packages/host-cloudflare/src/modules/relayer/README.md: "sends each dropped one again, same call and nonce, higher fee" → "sends each dropped one again, the same signed bytes"
- packages/host-cloudflare/src/modules/relayer/README.md: "so a dropped transaction is replaced once" → "so a dropped transaction is rebroadcast once"
- packages/host-cloudflare/src/modules/relayer/service.ts: "dropped transaction again with a higher fee" → "dropped transaction again, byte for byte"
- packages/host-cloudflare/src/modules/relayer/types.ts: "sends a dropped one again with a higher fee" → "sends a dropped one again, byte for byte"
