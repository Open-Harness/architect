<!-- Generated from the blueprint. Do not edit. -->
# gl-entry

One line of a company's general ledger, posted by a voucher.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| account | account.id |  |
| costCenter | cost-center.id |  |
| postingDate | Day |  |
| debit | Amount |  |
| credit | Amount |  |
| voucherType | VoucherType |  |
| voucherId | VoucherId |  |
| isCancelled | YesNo | Set on a line its voucher's cancel reversed, and on the reversing line itself: neither counts in a balance. |

## Operations

- [gl-entry.list](list.md): List gl-entrys, oldest first, 50 to a page, filtered by account, voucherId.
