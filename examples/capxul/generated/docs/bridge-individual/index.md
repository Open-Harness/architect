<!-- Generated from the blueprint. Do not edit. -->
# bridge-individual

A person's KYC with Bridge: the check of who they are.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| person | id | The person checked, who started it. |
| fullName | LegalName | The person's name as their documents give it, which Bridge checks. |
| email | text | Where Bridge writes to the person about their KYC. |
| kycLink | BridgeLink | Bridge's hosted KYC form for this person. |
| tosLink | BridgeLink | Bridge's terms of service, which the person accepts before they are approved. |

## Machine

States: started, approved, rejected. A move from the wrong state is refused BridgeIndividualNotStarted (exit 40).

| move | from | to | emits |
|---|---|---|---|
| start | (creates) | started | KycStarted |
| approve | started | approved | KycApproved |
| reject | started | rejected | KycRejected |

## Invariants

- `bridge-individual.oneKycPerForm`: another bridge individual holds this kyc link. Unique on kycLink, in every state; refuses nothing, a break is a defect.
- `bridge-individual.oneKycPerPerson`: another bridge individual holds this person. Unique on person, in every state; refused KycAlreadyStarted.

## Events

- `KycApproved`: carries individual (bridge-individual.id); emitted by the move approve
- `KycRejected`: carries individual (bridge-individual.id), reason (RejectionReason); emitted by the move reject
- `KycStarted`: carries individual (bridge-individual.id), person (bridge-individual.person: The person checked, who started it.); emitted by the move start

## Roles

- self

## Operations

- [bridge-individual.approve](approve.md): Record that Bridge approved a person's KYC.
- [bridge-individual.get](get.md): Read one bridge-individual by its id: person, fullName, email, kycLink, tosLink, state.
- [bridge-individual.reject](reject.md): Record that Bridge turned down a person's KYC, and why.
- [bridge-individual.start](start.md): Start your own KYC with Bridge: answers the form you fill in, and Bridge's terms.
