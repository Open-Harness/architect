<!-- Generated from the blueprint. Do not edit. -->
# bank-transaction.send

Send money out of a company's bank account to a payee, through Bridge.

**Who may call:** the owner of its account.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 800ms.

## Payload

| field | value | description |
|---|---|---|
| account | bank-transaction.account | The company's bank account the money moved on. |
| amount | Dollars | What to send, in dollars, at most six places, as Bridge takes it. |
| currency | bank-transaction.currency | The currency the payee is paid in: the account's own. |
| party | bank-transaction.party | The payee: the Bridge external account the money goes to. |

## Answer

| field | value | description |
|---|---|---|
| transaction | bank-transaction.id |  |
| reference | bank-transaction.reference | Bridge's id for the movement: the deposit's, or the transfer's. |

## Move

`send`: from nothing (it creates) to pending, emitting TransferSent.

## Steps

- `bank-transaction.send.load` (database)
- `bank-transaction.send.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AccountClosed | 41 | BT-001 | declared in errors.ts, carrying account |
| CurrencyNotHeld | 42 | BT-002 | declared in errors.ts, carrying currency |
| NothingToSend | 43 | BT-003 | declared in errors.ts |
| AlreadyRecorded | 44 | BT-004 | another bank transaction holds this reference; by the rule bank-transaction.oneTransactionPerMovement, carrying reference |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its account.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a bank account, end to end

Starts from an empty world.

- **Ada sends part of it out to a supplier.** `ada` (signed in) calls and sends account the last call's account, amount { value: `12075`, scale: 2 }, currency `USD`, party `ea_supplier`, with the request key `pay-supplier`, and gets back an answer matching `\S`.

### bridge: a transfer is paid or returned

Starts from the world `a transfer sent`.

- **the same request again is the same transfer, and sends nothing more.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `30025`, scale: 2 }, currency `USD`, party `ea_landlord`, with the request key `rent-december`, and gets back [the world's transfer, the world's transferReference].
- **Ada sends a deposit back to a tenant who moved out.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `950`, scale: 0 }, currency `USD`, party `ea_old_tenant`, with the request key `deposit-refund`, and gets back an answer matching `\S`.
- **Ada pays the cleaner too.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `80`, scale: 0 }, currency `USD`, party `ea_cleaner`, with the request key `cleaner`, and is answered.
- **Ada pays late in the day.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `5`, scale: 0 }, currency `USD`, party `ea_late`, with the request key `late`, and is answered.
- **Ada pays just after midnight.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `6`, scale: 0 }, currency `USD`, party `ea_early`, with the request key `early`, and is answered.

### bridge: each company's money is its own

Starts from the world `two companies' accounts`.

- **Ada pays a supplier from Acme Trading's account.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `15`, scale: 0 }, currency `USD`, party `ea_acme_supplier`, with the request key `acme-supplier`, and gets back an answer matching `^btx_[0-9a-z]+$`.

### bridge: send money out

Starts from the world `a reopened account`.

- **Bo can't send from Ada's account.** `bo` (signed in) calls and sends account the world's account, amount { value: `10`, scale: 0 }, currency `USD`, party `ea_bo_payee`, and is refused with NotAllowed, AR-001.
- **nothing is sent from the closed account.** `ada` (role company.owner) calls and sends account the world's old, amount { value: `10`, scale: 0 }, currency `USD`, party `ea_landlord`, and is refused with AccountClosed, BT-001, carrying account the world's old.
- **a closed account is refused before its currency or the amount is judged.** `ada` (role company.owner) calls and sends account the world's old, amount { value: `0`, scale: 0 }, currency `EUR`, party `ea_landlord`, and is refused with AccountClosed, BT-001, carrying account the world's old.
- **the dollar account doesn't pay in euros.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `10`, scale: 0 }, currency `EUR`, party `ea_landlord`, and is refused with CurrencyNotHeld, BT-002, carrying currency `EUR`.
- **nor the euro account in dollars, and the currency is judged before the amount.** `ada` (role company.owner) calls and sends account the world's payroll, amount { value: `0`, scale: 0 }, currency `USD`, party `ea_landlord`, and is refused with CurrencyNotHeld, BT-002, carrying currency `USD`.
- **a transfer of nothing is refused.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `0`, scale: 0 }, currency `USD`, party `ea_landlord`, and is refused with NothingToSend, BT-003.
- **and so is one below nothing.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `-1`, scale: 6 }, currency `USD`, party `ea_landlord`, and is refused with NothingToSend, BT-003.
- **Ada pays her landlord the rent.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `30025`, scale: 2 }, currency `USD`, party `ea_landlord`, with the request key `rent-december`, and gets back an answer matching `^btx_[0-9a-z]+$` and gets back an answer matching `\S`.
- **a second transfer is its own.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `30025`, scale: 2 }, currency `USD`, party `ea_landlord`, with the request key `rent-december-again`, and is answered.
- **Ada pays a supplier from Payroll, in euros, with all six places.** `ada` (role company.owner) calls and sends account the world's payroll, amount { value: `1000001`, scale: 6 }, currency `EUR`, party `ea_rhein_supplier`, and is answered.
- **the smallest transfer there is, one millionth of a dollar, is sent.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `1`, scale: 6 }, currency `USD`, party `ea_landlord`, and is answered.
- **a transfer past a float's whole numbers is exact to the millionth.** `ada` (role company.owner) calls and sends account the world's account, amount { value: `9007199254740993`, scale: 6 }, currency `USD`, party `ea_landlord`, and is answered.

## How to call

```sh
capxul bank-transaction send --account <account> --amount <amount> --currency <currency> --party <party>
```

HTTP: `POST /bank-transaction/send` with the payload as JSON. SDK: `Sdk.bank-transaction.send(payload)`.
