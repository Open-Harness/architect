<!-- Generated from the blueprint. Do not edit. -->
# bank-account.get

Read one bank-account by its id: company, business, accountName, currency, bankName, accountNumber, routingNumber, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | bank-account.id |

## Answer

| field | value | description |
|---|---|---|
| company | bank-account.company |  |
| business | bank-account.business | The company's approved KYB the account is opened on. |
| accountName | bank-account.accountName | What the company calls the account (ERPNext's `account_name`). |
| currency | bank-account.currency | The currency it takes deposits in. |
| bankName | bank-account.bankName | The bank that holds it, as Bridge names it. |
| accountNumber | bank-account.accountNumber | Its account number, or IBAN, as Bridge gives it. |
| routingNumber | bank-account.routingNumber | Its routing number, or BIC, as Bridge gives it. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### bridge: a bank account closes

Starts from the world `a bank account`.

- **Ada reads it back with the deposit details she was given.** `ada` (role company.owner) calls and sends id the world's account, and gets back [the world's company, the world's business, `Operating`, `USD`, the world's bankName, the world's accountNumber, the world's routingNumber, `open`].
- **the new account is a different one.** `ada` (role company.owner) calls and sends id the last call's account, and gets back `open`.
- **and the old one stays closed.** `ada` (role company.owner) calls and sends id the world's account, and gets back [`Operating`, `closed`].

### bridge: open a bank account

Starts from the world `kyb approved`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's account, and is refused with NotAllowed, AR-001.
- **it reads back as the second account, not the first.** `ada` (role company.owner) calls and sends id the last call's account, and gets back [the world's company, the world's business, `Payroll`, `EUR`, `open`] and gets back an answer matching `^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$`.

## How to call

```sh
capxul bank-account get --id <id>
```

HTTP: `POST /bank-account/get` with the payload as JSON. SDK: `Sdk.bank-account.get(payload)`.
