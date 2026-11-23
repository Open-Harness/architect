<!-- Generated from the blueprint. Do not edit. -->
# bank-account

A bank account a company holds through Bridge, which takes deposits in one currency.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| business | bridge-business.id | The company's approved KYB the account is opened on. |
| accountName | Name | What the company calls the account (ERPNext's `account_name`). |
| currency | AccountCurrency | The currency it takes deposits in. |
| bankName | DepositDetail | The bank that holds it, as Bridge names it. |
| accountNumber | DepositDetail | Its account number, or IBAN, as Bridge gives it. |
| routingNumber | DepositDetail | Its routing number, or BIC, as Bridge gives it. |

## Machine

States: open, closed. A move from the wrong state is refused BankAccountNotOpen (exit 40).

| move | from | to | emits |
|---|---|---|---|
| open | (creates) | open | BankAccountOpened |
| close | open | closed | BankAccountClosed |

## Invariants

- `bank-account.oneAccountPerNumber`: another bank account holds this account number. Unique on accountNumber, in every state; refuses nothing, a break is a defect.
- `bank-account.oneNamePerCompany`: another open bank account holds this company and account name. Unique on company, accountName, while open; refused BankAccountNameTaken.

## Events

- `BankAccountClosed`: carries account (bank-account.id); emitted by the move close
- `BankAccountOpened`: carries account (bank-account.id), company (bank-account.company), business (bank-account.business: The company's approved KYB the account is opened on.), currency (bank-account.currency: The currency it takes deposits in.); emitted by the move open

## Operations

- [bank-account.close](close.md): Close a company's bank account; it takes no more deposits.
- [bank-account.get](get.md): Read one bank-account by its id: company, business, accountName, currency, bankName, accountNumber, routingNumber, state.
- [bank-account.open](open.md): Open a bank account for a company whose KYB Bridge approved: answers where to send deposits.
