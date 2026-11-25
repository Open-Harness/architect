<!-- Generated from the blueprint. Do not edit. -->
# gl-entry.list

List gl-entrys, oldest first, 50 to a page, filtered by account, voucherId.

**Who may call:** the owner of its account.company.

**A read:** answered from the records, with no handler. A page of 50 at a time, oldest first, narrowed by account, voucherId; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| account (optional) | gl-entry.account |
| voucherId (optional) | gl-entry.voucherId |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its account.company; the handler never runs |

## Worked examples

### keep the books

Starts from the world `a chart`.

- **Rent's ledger holds one line, the rent's, posted by a journal entry.** `ada` (role company.owner) calls and sends account the world's rent, and gets back [[the world's rent, the world's costCenter, `2026-02-01`, `1500000000`, `0`, `Journal Entry`, false]] and gets back an answer matching `^jen_[0-9a-z]+$`.
- **Rent's ledger keeps the line and its reversal, both marked cancelled.** `ada` (role company.owner) calls and sends account the world's rent, and gets back [[the world's rent, the world's costCenter, `2026-02-01`, `1500000000`, `0`, `Journal Entry`, true], [the world's rent, the world's costCenter, `2026-02-01`, `0`, `1500000000`, `Journal Entry`, true]].

### post a journal entry

Starts from the world `a capital entry`.

- **a draft posts nothing: Bank's ledger is empty.** `ada` (role company.owner) calls and sends account the world's bank, and gets back 0.
- **Bank's ledger holds its debit, posted by the entry, on its day, in its company and cost center.** `ada` (role company.owner) calls and sends account the world's bank, and gets back [[the world's company, the world's bank, the world's costCenter, `2026-01-15`, `10000000000`, `0`, `Journal Entry`, the world's journalEntry, false]].
- **and Capital Stock's its credit.** `ada` (role company.owner) calls and sends account the world's capital, and gets back [[the world's company, the world's capital, the world's costCenter, `2026-01-15`, `0`, `10000000000`, `Journal Entry`, the world's journalEntry, false]].
- **Bo can't read Bank's ledger.** `bo` (signed in) calls and sends account the world's bank, and is refused with NotAllowed, AR-001.
- **Bank's ledger keeps the debit and adds its reversal, a credit, both marked cancelled.** `ada` (role company.owner) calls and sends account the world's bank, and gets back [[the world's company, the world's bank, the world's costCenter, `2026-01-15`, `10000000000`, `0`, `Journal Entry`, the world's journalEntry, true], [the world's company, the world's bank, the world's costCenter, `2026-01-15`, `0`, `10000000000`, `Journal Entry`, the world's journalEntry, true]].
- **Capital Stock's the same, the other way.** `ada` (role company.owner) calls and sends account the world's capital, and gets back [[the world's company, the world's capital, the world's costCenter, `2026-01-15`, `0`, `10000000000`, `Journal Entry`, the world's journalEntry, true], [the world's company, the world's capital, the world's costCenter, `2026-01-15`, `10000000000`, `0`, `Journal Entry`, the world's journalEntry, true]].
- **it posted nothing and is still a draft.** `ada` (role company.owner) calls and sends account the world's rent, voucherId the last call's journalEntry, and gets back 0.
- **Bank holds those two credits, apart.** `ada` (role company.owner) calls and sends account the world's bank, voucherId the last call's journalEntry, and gets back [[`2026-01-01`, `0`, `30000000`, false], [`2026-01-01`, `0`, `40000000`, false]].
- **Bank's line keeps Operations.** `ada` (role company.owner) calls and sends account the world's bank, voucherId the last call's journalEntry, and gets back [[the world's costCenter, `20000000`]].
- **Rent holds one line of that entry.** `ada` (role company.owner) calls and sends account the world's rent, voucherId the last call's items 0 voucherId, and gets back [[`20000000`, false]].

## How to call

```sh
capxul gl-entry list [--account <account>] [--voucherId <voucherId>] [--cursor <cursor>]
```

HTTP: `POST /gl-entry/list` with the payload as JSON. SDK: `Sdk.gl-entry.list(payload)`.
