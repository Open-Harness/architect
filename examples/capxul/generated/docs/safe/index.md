<!-- Generated from the blueprint. Do not edit. -->
# safe

A Safe: a person's own on-chain account, or a company's, at the address it has before it is deployed.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| kind | SafeKind | Whose it is: a person's own, or a company's. |
| person (optional) | id | Whose Safe it is, when it is a person's. |
| company (optional) | company.id | The company it is for, when it is a company's. |
| account | account | Its address, worked out before it is deployed, as a CAIP-10 account with the address checksummed (EIP-55). |
| firstOwner | account | The one owner it is set up with, checksummed: the bootstrap key for a person's, the founder's own Safe for a company's. |
| owners | schema | Who owns it today: its first owner until the chain says otherwise. |
| threshold | Threshold | How many owners must approve a transaction: 1 at setup. |
| saltNonce | SaltNonce | The salt nonce its address is worked out from, kept so the address can be checked again. |

## Machine

States: counterfactual. A move from the wrong state is refused SafeNotCounterfactual (exit 40).

| move | from | to | emits |
|---|---|---|---|
| record | (creates) | counterfactual | PersonalSafeRecorded |
| recordCompany | (creates) | counterfactual | CompanySafeRecorded |

## Invariants

- `safe.oneSafeEach`: another safe holds this salt nonce. Unique on saltNonce, in every state; refused SafeAlreadyRecorded.

## Events

- `CompanySafeRecorded`: carries safe (safe.id), company (safe.company: The company it is for, when it is a company's.), account (safe.account: Its address, worked out before it is deployed, as a CAIP-10 account with the address checksummed (EIP-55).); emitted by the move recordCompany
- `PersonalSafeRecorded`: carries safe (safe.id), person (safe.person: Whose Safe it is, when it is a person's.), account (safe.account: Its address, worked out before it is deployed, as a CAIP-10 account with the address checksummed (EIP-55).); emitted by the move record

## Roles

- holder

## Operations

- [safe.get](get.md): Read one safe by its id: kind, person, company, account, firstOwner, owners, threshold, saltNonce, state.
- [safe.record](record.md): Record your own Safe, at the address it will have once deployed. Nothing is sent to the chain.
- [safe.record-company](record-company.md): Record a company's Safe, owned by its founder's own Safe, at the address it will have once deployed.
