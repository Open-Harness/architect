<!-- Generated from the blueprint. Do not edit. -->
# bank-account.open

Open a bank account for a company whose KYB Bridge approved: answers where to send deposits.

**Who may call:** the owner of its business.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 800ms.

## Payload

| field | value | description |
|---|---|---|
| business | bank-account.business | The company's approved KYB the account is opened on. |
| accountName | bank-account.accountName | What the company calls the account (ERPNext's `account_name`). |
| currency | bank-account.currency | The currency it takes deposits in. |

## Answer

| field | value | description |
|---|---|---|
| account | bank-account.id |  |
| bankName | bank-account.bankName | The bank that holds it, as Bridge names it. |
| accountNumber | bank-account.accountNumber | Its account number, or IBAN, as Bridge gives it. |
| routingNumber | bank-account.routingNumber | Its routing number, or BIC, as Bridge gives it. |

## Move

`open`: from nothing (it creates) to open, emitting BankAccountOpened.

## Steps

- `bank-account.open.load` (database)
- `bank-account.open.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| KybNotApproved | 41 | BA-001 | declared in errors.ts |
| BankAccountNameTaken | 42 | BA-002 | another open bank account holds this company and account name; by the rule bank-account.oneNamePerCompany, carrying accountName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its business.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a bank account closes

Starts from the world `a bank account`.

- **a closed account frees its name for a new one.** `ada` (role company.owner) calls and sends business the world's business, accountName `Operating`, currency `USD`, and gets back an answer matching `^bac_[0-9a-z]+$`.

### bridge: kyb is decided by bridge

Starts from the world `kyb started`.

- **nor open a bank account before Bridge approves it.** `ada` (role company.owner) calls and sends business the world's business, accountName `Operating`, currency `USD`, and is refused with KybNotApproved, BA-001.
- **and opens no bank account.** `bo` (signed in) calls and sends business the last call's business, accountName `Main`, currency `EUR`, and is refused with KybNotApproved, BA-001.

### bridge: open a bank account

Starts from the world `kyb approved`.

- **Bo can't open an account on Ada's company.** `bo` (signed in) calls and sends business the world's business, accountName `Operating`, currency `USD`, and is refused with NotAllowed, AR-001.
- **Ada opens a US dollar account and gets where to send deposits.** `ada` (role company.owner) calls and sends business the world's business, accountName `Operating`, currency `USD`, with the request key `acme-operating`, and gets back an answer matching `^bac_[0-9a-z]+$` and gets back an answer matching `\S` and gets back an answer matching `^\d{4,17}$` and gets back an answer matching `^\d{9}$`.
- **the company has one open account by a name.** `ada` (role company.owner) calls and sends business the world's business, accountName `Operating`, currency `EUR`, and is refused with BankAccountNameTaken, BA-002, carrying accountName `Operating`.
- **she opens a euro account under another name.** `ada` (role company.owner) calls and sends business the world's business, accountName `Payroll`, currency `EUR`, and gets back an answer matching `^bac_[0-9a-z]+$` and gets back an answer matching `^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$` and gets back an answer matching `^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$`.

## How to call

```sh
capxul bank-account open --business <business> --accountName <accountName> --currency <currency>
```

HTTP: `POST /bank-account/open` with the payload as JSON. SDK: `Sdk.bank-account.open(payload)`.
