<!-- Generated from the blueprint. Do not edit. -->
# safe.get

Read one safe by its id: kind, person, company, account, firstOwner, owners, threshold, saltNonce, state.

**Who may call:** the holder of the safe, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | safe.id |

## Answer

| field | value | description |
|---|---|---|
| kind | safe.kind | Whose it is: a person's own, or a company's. |
| person (optional) | safe.person | Whose Safe it is, when it is a person's. |
| company (optional) | safe.company | The company it is for, when it is a company's. |
| account | safe.account | Its address, worked out before it is deployed, as a CAIP-10 account with the address checksummed (EIP-55). |
| firstOwner | safe.firstOwner | The one owner it is set up with, checksummed: the bootstrap key for a person's, the founder's own Safe for a company's. |
| owners | safe.owners | Who owns it today: its first owner until the chain says otherwise. |
| threshold | safe.threshold | How many owners must approve a transaction: 1 at setup. |
| saltNonce | safe.saltNonce | The salt nonce its address is worked out from, kept so the address can be checked again. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the holder of the safe, or the owner of its company; the handler never runs |

## Worked examples

### safe: a company records its safe

Starts from the world `three company safes`.

- **Ada's Safe holds the address her key was answered, the factory's for her id.** `ada` (signed in) calls and sends id the world's adaSafe, and gets back [`personal`, the cast's ada person, `none`, the world's adaAccount, `eip155:31337:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`, [`eip155:31337:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`], `1`, `counterfactual`] and gets back ``.
- **Bo's Safe holds the address his agent was answered.** `bo` (signed in) calls and sends id the world's boSafe, and gets back [`personal`, the cast's bo person, `none`, the world's boAccount, `eip155:31337:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`, [`eip155:31337:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`], `1`, `counterfactual`] and gets back ``.
- **Bo can't read Acme Trading's Safe.** `bo` (signed in) calls and sends id the world's tradingSafe, and is refused with NotAllowed, AR-001.
- **Acme Trading's Safe holds what Ada's agent was answered: owned by her own Safe alone, at the factory's address for that owner and the company's id.** `ada` (signed in) calls and sends id the world's tradingSafe, and gets back [`company`, the world's company, `none`, the world's tradingAccount, the world's adaAccount, [the world's adaAccount], `1`, `counterfactual`] and gets back ``.
- **Ada reads Acme Trading's Safe again, for its salt nonce.** `ada` (signed in) calls and sends id the world's tradingSafe, and gets back the world's tradingAccount.
- **Acme Logistics' Safe holds what Ada's key was answered: the same owner, Ada's Safe, and an address of its own.** `ada` (signed in) calls and sends id the world's logisticsSafe, and gets back [`company`, the world's otherCompany, `none`, the world's logisticsAccount, the world's adaAccount, [the world's adaAccount], `1`, `counterfactual`] and gets back ``.
- **Bo Ltd's Safe holds what Bo was answered: owned by Bo's own Safe, not Ada's, and its address follows.** `bo` (signed in) calls and sends id the world's boLtdSafe, and gets back [`company`, the world's boCompany, `none`, the world's boLtdAccount, the world's boAccount, [the world's boAccount], `1`, `counterfactual`] and gets back ``.

### safe: a founder without a safe is refused

Starts from the world `ada has a safe`.

- **it is Bo Ltd's, owned by one Safe, not the bootstrap key, at the factory's address for it.** `bo` (signed in) calls and sends id the last call's safe, and gets back [`company`, the world's boCompany, `none`, `1`, [the last call's firstOwner], `counterfactual`] and gets back false and gets back ``.

### safe: a person records their safe

Starts from an empty world.

- **Bo can't read Ada's Safe.** `bo` (signed in) calls and sends id the last call's safe, and is refused with NotAllowed, AR-001.
- **Ada reads it back: hers, owned by the bootstrap key alone, at the factory's address for her id.** `ada` (signed in) calls and sends id the last call's safe, and gets back [`personal`, the cast's ada person, `none`, `eip155:31337:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`, [`eip155:31337:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`], `1`, `counterfactual`] and gets back ``.
- **Ada can't read Bo's.** `ada` (signed in) calls and sends id the last call's safe, and is refused with NotAllowed, AR-001.
- **Bo's agent reads it back: Bo's, at the factory's address for his id, not Ada's.** `bo` (signed in) calls and sends id the last call's safe, and gets back [`personal`, the cast's bo person, `none`, `eip155:31337:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`, [`eip155:31337:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`], `1`, `counterfactual`] and gets back ``.

## How to call

```sh
capxul safe get --id <id>
```

HTTP: `POST /safe/get` with the payload as JSON. SDK: `Sdk.safe.get(payload)`.
