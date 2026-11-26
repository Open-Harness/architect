# CX-bridge: Capxul's Bridge adapter, its calls, its events, and Bank Transaction

**Decided 25 November 2026** by Goal 16's Bridge checks author, with Goal 16's lead (thread
T-01a2093c-8643-7794-9ce7-5dbc110ce4aa), under Aaron's calls in CX-grill: Capxul serves Bridge through its own Bridge
account, with no bring-your-own account (section 4); paid services are built now and switched on later (section 4);
money is held in base units (section 3); and every company uses one dollar asset, USDC (section 3). This is the first
author pull request of #716's second half. It settles #912's checksum part.

## Bridge's description, as read

Bridge's API reference loads `https://withbridge-image1-sv-usw2-monorail-openapi.s3.amazonaws.com/latest.json`. On
25 November 2026 it was OpenAPI 3.0.2, `info.version` `1`, 937,576 bytes, sha256 `a854564e…bf391a07`, with 106 paths.
The spike (#744) read 934,543 bytes, sha256 `9ce92ed1…`, so the file moved in two days. It is fetched fresh for each
generation and never committed.

`ortho new adapter bridge --from-openapi` at `goal/superagent` 446fb6dd (#946's generator fixes) generates 144 calls and
0 events in 1.7 s. Every call sends the key as `Api-Key`, and the 38 that take an `Idempotency-Key` send one. The
generated plugin waits in a scratch checkout until 446fb6dd reaches `goal/capxul`, and its files land then. Only the
scaffolds (`src/written.ts` and `src/stand-in/`) are in this pull request.

## The calls Capxul makes

Each was checked against `latest.json` (method, path, and whether it takes an `Idempotency-Key`). The body fields are
those Capxul sends; Bridge requires fewer (`kyc_links` only `type` and `email`, `transfers` only `on_behalf_of`,
`source` and `destination`), and the stand-in requires what Capxul sends. The name is the generated call's.

| Capxul operation | Bridge call (body fields Capxul sends) | Generated name | Idempotency-Key |
|---|---|---|---|
| `bridge-individual.start`, `bridge-business.start` | `POST /v0/kyc_links` (`type`, `full_name`, `email`) | `kycLinks.create` | yes |
| (reading a decision when an event is late) | `GET /v0/kyc_links/{kycLinkID}` | `kycLinks.get` | no |
| `bank-account.open` | `POST /v0/customers/{customerID}/virtual_accounts` (`source.currency`, `destination`) | `customers.virtualAccounts.create` | yes |
| `bank-account.close` | `POST /v0/customers/{customerID}/virtual_accounts/{virtualAccountID}/deactivate` | `customers.virtualAccounts.deactivate.create` | yes |
| `bank-transaction.send` | `POST /v0/transfers` (`on_behalf_of`, `source`, `destination`, `amount`) | `transfers.create` | yes |
| (reading a transfer when an event is late) | `GET /v0/transfers/{transferID}` | `transfers.get` | no |

Out, as known limits: creating a business customer and its associated persons through the API (`customers.create`,
whose body rule is snag #992), Bridge wallets and cards, incorporation (Bridge has no incorporation API, and what help
with incorporation means is still open for Aaron), and every other call.

**Snag #996 doesn't reach these calls.** The generator drops the body fields of a `oneOf` or `anyOf` nested inside
another alternative, so the client refuses a valid input that uses them. Read on `latest.json` (sha256 `a854564e…`):
the bodies of `kycLinks.create`, `customers.virtualAccounts.create` and `transfers.create` are plain objects, and
`deactivate` takes none, so none has an alternative to nest in. Their `source` and `destination` are judged whole as one
field's value. The generated client at 446fb6dd accepted a valid input for each, sending it and failing only on the
closed port (`Unreachable`, not `InputRefused`): an individual and a business KYC link, a USD and a EUR virtual account,
a deactivation, and an ACH and a SEPA transfer. `customers.create`, which is out, has a `oneOf` body with no
alternative nested inside its alternatives.

## A transfer's Idempotency-Key

`bank-transaction.send` is `idempotent: "request"`: the same request key from the same caller is one call, and the
runtime answers a repeat with the kept answer without running the handler. The `Idempotency-Key` it sends to
`transfers.create` is derived from that request key, so that a handler that fails after Bridge answered, and is called
again, makes no second transfer at Bridge. A random key per attempt, which the generated client sends when given none,
is the wrong build. It can be caught only once a step can reach Bridge's stand-in and read what it issued (#995).

## Bridge's webhooks: the hand-written events

Bridge's description has no `webhooks` section, so the events are written in the plugin's `src/written.ts`, from
`platform/additional-information/webhooks/structure`. Every delivery is one envelope:

- `api_version` (`v0`), `event_id` (unique per event and the same on each retry: "useful as an idempotency key"),
  `event_developer_id`, `event_sequence`;
- `event_category`, `event_type` (`<category>.<created | updated | updated.status_transitioned | deleted>`);
- `event_object_id`, `event_object_status` (a `kyc_status` or a transfer's `state`);
- `event_object` (the resource as the API renders it), `event_object_changes` and `event_created_at`.

Capxul takes three categories:

- `kyc_link`, whose `kyc_status` decides a KYC or a KYB (`approved`, or `rejected` with `rejection_reasons`);
- `virtual_account.activity`, whose `type` is one step of a deposit (`funds_received`, `payment_submitted`,
  `payment_processed`, among 13);
- `transfer`, whose `state` is one of Bridge's `TransferState`.

The event's identity is its `event_id`, and a repeat is compared on `event_object`.

**Signing.** Bridge sends `X-Webhook-Signature: t=<milliseconds>,v0=<base64>`: RSA PKCS#1 v1.5 with the endpoint's
public key, over SHA256(SHA256("<t>.<raw body>")). A receiver refuses one more than ten minutes old
(`webhooks/signature`). `AdapterDoor` verifies only an HMAC-SHA256 hex signature with a separate timestamp header, so
Bridge has no door until #995's gap 5.

## Bank Transaction

ERPNext's Bank Transaction (`erpnext/accounts/doctype/bank_transaction`), per company:

- **Fields:** `company`, `account` (ERPNext's `bank_account`), `date`, `deposit`, `withdrawal`, `currency`, `reference`
  (ERPNext's `transaction_id`, the bank's own id for the movement, which ERPNext's bank imports dedupe on: here Bridge's)
  and `party` (`bank_party_name`).
- **Base units.** `deposit` and `withdrawal` are USDC in base units (`Blueprint.money(usdc)`), one of the two 0, because
  Bridge lands a deposit as USDC in Capxul's custody and sends a transfer from it (Superseded by CX-bridge-rails,
  26 November 2026: Bridge holds nothing; a deposit lands in the company's Safe and a transfer is paid from it).
  `currency` is the account's, the one
  the money moved in at the bank. Unlike ERPNext's, the two amounts are not in the row's `currency`: an EUR account's
  rows hold USDC too.
- **Bridge's amounts** are decimal strings in dollars. A virtual account's activity is "a dollar denominated string", and
  a transfer's amount is "in the fiat currency to which the source currency is pegged". Bridge's examples use up to six
  places (`"1.234567"`). So the operations take `Blueprint.decimal({ places: 6 })` (#977, #974), and the handler turns it
  into base units exactly. A seventh place is refused on the wire.
- **States:** `pending`, `settled` and `failed`, from ERPNext's Pending, Settled and Cancelled. A deposit Bridge reports
  has landed (`land`, to `settled`). A transfer out is `pending` (`send`) until Bridge says `payment_processed`
  (`settle`) or a final failure: `canceled`, `undeliverable`, `returned` or `refunded` (`fail`, carried in
  `TransferFailed`). `refund_failed` is left out: Bridge's refund to the sender failed, but the transfer itself has
  not ended, and Bridge moves it on. Reconciling comes with the books (slice 7).
- **Refusals on `send`, in this order:** `AccountClosed` (Bridge has deactivated it), `CurrencyNotHeld` (each virtual
  account takes one currency), then `NothingToSend` (an amount of 0 or less). `land` refuses nothing of its own: only
  Bridge calls it, and a deposit of 0 or less from Bridge waits for the door's checks (#995).

**Once per movement, keyed on Bridge's id for the movement.** `oneTransactionPerMovement` is unique on `reference`,
refusing `AlreadyRecorded`. Goal 16's lead asked for the webhook's `event_id` as the key. This record keys on the
movement instead, for this reason: one deposit is three `virtual_account.activity` events (`funds_received`,
`payment_submitted`, `payment_processed`), each with its own `event_id` and all with the same `deposit_id`. Keyed on
`event_id`, a handler that lands on more than one of them counts the deposit up to three times. So would a catch-up
read (`virtualAccounts.history.list`), which has no `event_id` at all. Keyed on `deposit_id`, a retried event, a later
activity of the same deposit and a poll all hit the same rule, which is what the replay check in the second author pull
request needs. A transfer's reference is Bridge's transfer `id`. Goal 16's lead confirmed this key on #1007, replacing
the earlier call for `event_id`. Two things follow. A later event for the same movement updates its row's status and is
never refused: the door's handler (#995 gap 4) finds the row by its reference first, so it never trips the rule, and
`land`'s `AlreadyRecorded` is the rule itself answering a second report of the same deposit. And redelivery of the same
`event_id` is the door's journal's job (gap 4), not this rule's.

## The world's clock in the journeys

A `prove` run shares one world clock across its journeys, and the clock never goes back. `bridge-a-transfer-is-paid-or-
returned` is the only Bridge journey that moves it: to 23:30 and then past midnight on 2026-12-01, and only that far,
because interview feedback moves it to 2026-12-02T23:59:59 next. The Bridge journeys that run before it read
2026-12-01. Renaming a journey changes the order, so a journey that moves the clock checks this first.

## Who speaks for Bridge, until #995

A step can't yet call the adapter (#995 gap 1), and an incoming event can't yet run an operation (gap 4). So Bridge's
reports stay the system's calls (`Blueprint.system`), as `journeys/README.md` already has them for KYC and KYB:
`bank-transaction.land`, `settle` and `fail`. When the door lands, its events take the system's place with the same
fields, and the journeys keep their steps. Until gap 1, `send`'s handler records the transfer with a reference of its
own.

## The stand-in

`plugins/bridge/src/stand-in/` answers the calls above. Every answer is one of Bridge's published examples, with fresh
ids and the caller's fields. It keeps Bridge's header rules: no `Api-Key` is 401, a POST without an `Idempotency-Key`
is 400, and a key seen before gets the first answer again. It opens no virtual account before the customer is
approved. It records what it issued (`/_stand/issued`), and it signs webhooks as Bridge does. Its own test is
`tests/bridge-stand-in.test.ts`.

**Until #995, `bank-account.open` makes its own details, and a EUR one can clash.** No step reaches the stand-in yet,
so the handler (`src/bank-account/open.ts`, #1027) draws the numbers from the account's random id, in the guide's banks
below. A USD account number is 17 digits. A EUR account number is the 8 digits an Irish IBAN leaves after Modulr's sort
code, so there are 10^8 of them, with about a 1% chance of a clash by 1,400 EUR accounts. A clash fails `open` as a
defect, never silently: `bank-account.oneAccountPerNumber` names no refusal, so the runtime stops the write. Part two
replaces this with the IBAN Bridge issues.

**Its deposit details are the guide's, not `latest.json`'s.** The virtual account examples in `latest.json` give
routing `87654321` (eight digits, so it fails ABA), account `123456789` and IBAN `X6099`. A correct relay of those
would fail the checksum checks, so the stand-in can't use them. Bridge's virtual account guide
(`get-started/guides/move-money/virtualaccounts`) gives two:

- **USD:** Lead Bank, routing `101019644` (passes ABA 3-7-1), account `215268120000`. The stand-in uses these, and each
  later account takes the next number.
- **EUR:** Modulr Finance, Ireland Branch, BIC `MODRIE00XXX`, IBAN `IE90MODR14035307970528`. That IBAN fails ISO 13616's
  mod 97: the remainder is 57, checked by two independent computations. So the stand-in keeps the guide's bank, BIC, sort
  code (140353) and account (07970528), and computes the true check digits: `IE34MODR14035307970528`.

**Its answers fit Bridge's schemas, which Bridge's own examples don't always match.** The generated client is strict by
default: it refuses an answer that misfits the call's schema. `tests/bridge-stand-in.test.ts` runs the strict client
against the stand-in on every call Capxul makes:

- **Transfers:** every example's `receipt` lacks the `*_currency` field beside each amount (`initial_amount_currency`,
  `developer_fee_currency`, `exchange_fee_currency`, `subtotal_amount_currency`), which `Receipt` requires. The stand-in
  gives the source currency for those and the destination's for `final_amount_currency`. A transfer's `currency` is the
  fiat its source is pegged to (USDC is `usd`), as `TransferResponse` says.
- **USD virtual accounts:** `bank_beneficiary_address` is required, and Bridge's examples carry it; the stand-in had left
  it out. It now gives the schema example's `1234 Main St., Kansas City, MO 64108`.
- **EUR virtual accounts: the schema and the examples disagree.** `VirtualAccountSourceDepositInstructionsEu` types
  `payment_rails` as the string `"sepa"`, with no `payment_rail`. Bridge's own EUR examples give `payment_rails:
  ["sepa"]` (a list, as on USD) or the deprecated `payment_rail: "sepa"`, never the string. The stand-in follows the
  schema, because the schema is what the generated client judges. **Goal 16's lead settled it on #1007: the client
  stays strict, and the description is corrected.** A lenient client stops catching real drift. In part two, the
  adapter's description takes a string or an array of strings at `payment_rails` in
  `VirtualAccountSourceDepositInstructionsEu`. Part two records the exact JSON path, the before and after, and why
  (Bridge's own EUR examples), then regenerates and has the stand-in answer EUR with the array. The deprecated
  `payment_rail` stays undeclared, so an answer that carries it alone fails loudly. When a real Bridge sandbox answer is
  available, part two compares it once and notes the result here. latest.json itself is never committed, so part two
  also says where the corrected description is kept. USD is unaffected.
- **Virtual account create** answers 200, the only success the description documents, and a transfer's
  `client_reference_id` is left out unless the caller gave one.

## The checks this pull request adds, and those that wait on #995

**Added:**

- **ABA and IBAN checksums (#912)** on every account the journeys open. On USD, `routingNumber` is nine digits with an
  assigned Federal Reserve prefix and passes 3-7-1, and `accountNumber` is 4 to 17 digits. On EUR, `accountNumber` is
  an IBAN of a registry country, of that country's length, passing mod 97, and `routingNumber` is a BIC in the same
  country. The rules are in `journeys/support/deposit-details.ts`.
- **Bank Transaction:** deposits, transfers out, their refusals, Bridge's two outcomes, and the K42 §6 end-to-end journey
  `bridge-a-bank-account-end-to-end`.

**Waiting on #995, each in the second author pull request:**

| Check | Waits on |
|---|---|
| `bank-account.open`'s details equal the `source_deposit_instructions` the stand-in issued for that virtual account | gap 3 (a step reads the stand-in), and gaps 1 and 2 |
| a transfer retried with the same request sends the same `Idempotency-Key` to Bridge, and Bridge holds one transfer | gaps 1, 2 and 3 |
| KYC and KYB decided by Bridge's `kyc_link` event, an event for an unknown customer ignored | gaps 4 and 5 |
| a deposit's activity events land one Bank Transaction, replayed too | gaps 3, 4 and 5 |
| an EUR virtual account answered with `payment_rails: ["sepa"]` taken by the strict client, from the corrected description | the description patch above |
| a deposit's second and third activity events leave exactly one Bank Transaction, in its latest status (`settled`, a deposit's one state today), none refused | gaps 3, 4 and 5 |
| an unsigned, wrongly signed or stale event refused, and nothing written | gaps 3 and 5 |
| a transfer's state events move its Bank Transaction | gaps 3, 4 and 5 |

## Supersedes

- `examples/capxul/journeys/README.md`: "Bridge's webhooks as events (deposits landing as Bank Transactions, transfers), Bridge's" → "Bridge's webhooks arriving signed through its door and moving the records"
- `examples/capxul/journeys/README.md`: "The journeys judge their shape" → "The journeys judge that they are a bank's (#912, `support/deposit-details.ts`)"

The brief (`design/goals/16-capxul.md`) still lists help with incorporation in slice 10; it is the lead's file, so the
lead changes it.
