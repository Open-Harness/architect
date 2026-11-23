<!-- Generated from the blueprint. Do not edit. -->
# bridge-business

A company's KYB with Bridge: the check of who the business is, which its bank accounts need.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| legalName | LegalName | The company's name as it is registered, which Bridge checks. |
| email | text | Where Bridge writes to the business about its KYB. |
| kybLink | BridgeLink | Bridge's hosted KYB form for this business. |
| tosLink | BridgeLink | Bridge's terms of service, which the business accepts before it is approved. |

## Machine

States: started, approved, rejected. A move from the wrong state is refused BridgeBusinessNotStarted (exit 40).

| move | from | to | emits |
|---|---|---|---|
| start | (creates) | started | KybStarted |
| approve | started | approved | KybApproved |
| reject | started | rejected | KybRejected |

## Invariants

- `bridge-business.oneKybPerCompany`: another bridge business holds this company. Unique on company, in every state; refused KybAlreadyStarted.

## Events

- `KybApproved`: carries business (bridge-business.id); emitted by the move approve
- `KybRejected`: carries business (bridge-business.id), reason (RejectionReason); emitted by the move reject
- `KybStarted`: carries business (bridge-business.id), company (bridge-business.company); emitted by the move start

## Operations

- [bridge-business.approve](approve.md): Record that Bridge approved a company's KYB.
- [bridge-business.get](get.md): Read one bridge-business by its id: company, legalName, email, kybLink, tosLink, state.
- [bridge-business.reject](reject.md): Record that Bridge turned down a company's KYB, and why.
- [bridge-business.start](start.md): Start a company's KYB with Bridge: answers the form the business fills in, and Bridge's terms.
