<!-- Generated from the blueprint. Do not edit. -->
# payment-entry

Money a company receives from a customer or supplier, or pays to one, posted to the ledger when submitted.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| paymentType | PaymentType |
| postingDate | Day |
| partyType | PartyType |
| party | PartyId |
| paidFrom | account.id |
| paidTo | account.id |
| paidAmount | Amount |
| costCenter | cost-center.id |

## Machine

States: draft, submitted, cancelled. A move from the wrong state is refused PaymentEntryNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | PaymentEntryDrafted |
| submit | draft | submitted | PaymentEntrySubmitted |
| cancel | submitted | cancelled | PaymentEntryCancelled |

## Events

- `PaymentEntryCancelled`: carries paymentEntry (payment-entry.id), reversed (LineCount); emitted by the move cancel
- `PaymentEntryDrafted`: carries paymentEntry (payment-entry.id), company (payment-entry.company), paymentType (payment-entry.paymentType), partyType (payment-entry.partyType), party (payment-entry.party), paidAmount (payment-entry.paidAmount); emitted by the move create
- `PaymentEntrySubmitted`: carries paymentEntry (payment-entry.id), posted (LineCount); emitted by the move submit

## Operations

- [payment-entry.cancel](cancel.md): Cancel a submitted payment, posting a reversing ledger line for each it posted.
- [payment-entry.create](create.md): Draft a payment received from a party or paid to one, with no invoice: an advance.
- [payment-entry.get](get.md): Read one payment-entry by its id: company, paymentType, postingDate, partyType, party, paidFrom, paidTo, paidAmount, costCenter, state.
- [payment-entry.submit](submit.md): Submit a payment, posting the party's ledger line and the bank's.
