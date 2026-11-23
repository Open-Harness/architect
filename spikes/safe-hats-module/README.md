# Spike: Safe, Hats and budgets

**Question.** Can a Safe let a Hats Protocol wearer spend from a budget per
hat and period, and what exactly does a client need the Safe owners to sign?

**Answer.** Yes. On Anvil, a wearer paid from a Safe with the module enabled,
and an agent paid from its own smaller budget. To act through the Safe's
owner threshold, the client builds the exact [SafeTx](#safetx-signatures) and
packs the owner signatures in address order.

## What was tried

The spike deployed Safe Smart Account 1.5.0 and Hats Protocol v1 from their
pinned sources on local Anvil. It enabled a module by having owners sign
real Safe transactions. It exercised ETH and ERC-20 payouts, put two Safes
behind one budget module, and moved time across a budget boundary. Foundry
checked the spending limits against an independent ledger and tested a
deliberately broken rollover. [Release pins](versions.json)

Run `./run-all.sh` with the pinned Node and npm versions from
`versions.json`. The install checks the release archives and prepares the
toolchain. Forge builds and tests offline. The final script starts Anvil
on a free loopback port and waits for its own process to exit, including
on interruption. [Fresh-folder run](evidence/run-all.txt)

## What was found

### For Goal 4

1. **A1. Deploy Safe.** Safe 1.5.0 supplies the hash-based ERC-1271
   owner-signature path used in the spike. The run deployed the `Safe` singleton,
   `SafeProxyFactory` and `CompatibilityFallbackHandler`. Single calls
   needed no MultiSend. [Deployment](evidence/goal-4.txt#L1)
2. **A2. Enable a module.** The 1-of-1 and 2-of-3 Safes both enabled a
   module through signed SafeTx calls. The script read back that each was
   enabled. The four signature formats executed, and Safe refused reversed
   owner order, a wrong recovery value and a nonce replay with `GS026`.
   [Enablement](evidence/goal-4.txt#L11) · [Signature run](evidence/safe-signatures.txt)
3. **A3. Pay an ERC-20 from the Safe.** The boolean-only module entry
   returned true when the token returned false. For a reverting token it
   returned false. The return-data entry let the payment code distinguish
   `TokenRejectedTransfer()` from `PaymentReverted(bytes)`.
   [Token payouts and refusals](evidence/goal-4.txt#L14)
4. **A4. Use a Safe as a signer.** The owners signed a `SafeMessage`
   wrapping the module's EIP-712 digest. The Safe's compatibility handler
   returned ERC-1271's magic value and OpenZeppelin's `SignatureChecker`
   accepted it. The module refused a tampered signature.
   [ERC-1271 run](evidence/goal-4.txt#L30)
5. **A5. Call the direct entry through Safe.** An address outside the
   owner set submitted the signed SafeTx and the recipient was paid.
   The gas for this route and A4 is recorded below.
   [Direct relay](evidence/goal-4.txt#L33)

### The hat module

6. A real hat wearer spent ETH and ERC-20. A disabled module, an outsider,
   an inactive hat and an ineligible wearer were all refused.
   [Anvil run](evidence/hat-anvil.txt) · [Foundry run](evidence/hat-foundry.txt)

### The budgets module

7. One module served two Safes, with separate rows for each Safe and hat pair.
   Only a call from the paying Safe can create, change or revoke its budget.
   The person created a child hat for the agent. The agent spent under its
   own lower limit and lost access when the person turned its hat off.
   [Budget run](evidence/budget-anvil.txt) · [Admin tests](evidence/budget-foundry.txt#L15)
8. The signed spend checks the deadline, signature, nonce, row, hat, amount
   and payment in that order, then emits the spend. The module checks its
   own EIP-712 `BudgetSpend` signature through `SignatureChecker`. Use the
   module address as the verifying contract and `Budgets` and `1` for the
   domain name and version. The same nonce sequence covers direct and
   relayed spends. Budget events start with indexed `by` and then `nonce`.
   [Anvil relay](evidence/budget-anvil.txt#L17) · [Signature tests](evidence/budget-foundry.txt#L19) · [Typed-data encoder](script/budget-data.ts)
9. Money stays in unsigned `uint128` base units of the row's ERC-20.
   The wire uses digit strings. The two tokens displayed exactly
   `1.250001 SPIKE6` and `1.250000000000000001 SPIKE`. Foundry also
   paid the full `uint128` maximum. The Anvil run restored the full limit
   after a period elapsed and matched the Safe balance change to the
   payouts. [Money and rollover](evidence/budget-anvil.txt#L20) · [Maximum amount test](evidence/budget-foundry.txt#L21)

### The fuzz

10. All 8,192 calls passed over 128 sequences at depth 64 using seed
    `0x7`. The handler compared both hats' spend by period with an
    independent ledger and checked the Safe and recipient balances.
    The mutant failed on its first run. Foundry shrank it to a spend, a
    warp across the boundary and a limit change. The previous period's
    100 units were still charged in the new period, which should start
    at zero. [Invariant and mutant](evidence/budget-invariant.txt)

## SafeTx signatures

The owners sign EIP-712 typed data with `primaryType: "SafeTx"`. The domain is
`EIP712Domain(uint256 chainId,address verifyingContract)`. Read `chainId` from the
network and use the Safe **proxy** address as `verifyingContract`. The domain has
two fields. The client builds the message and checks that its digest equals
the proxy's `getTransactionHash(..., nonce)`. [Runnable encoder](script/safe.ts)

The type string is exact, including field order and spelling.

```text
SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)
```

- `to` is the destination and `value` is native currency in wei. `data` is
  the raw target calldata. EIP-712 uses `keccak256(data)` in the struct hash.
- `operation` is `0` for Call and `1` for DelegateCall. This spike uses Call.
- `safeTxGas`, `baseGas`, `gasPrice`, `gasToken` and `refundReceiver` are the
  Safe execution and reimbursement settings. The proof uses zero for all five.
- `nonce` is read from the Safe proxy. Owners sign it with the other fields.
  The relayer sends the other nine fields and the packed signatures to
  `execTransaction`. Safe takes the nonce from storage. It is separate from
  the relayer's account nonce and from the budgets module's spend nonce.

Pack one 65-byte header per required signature. Sort headers by increasing
numeric **owner** address. Checksummed casing has no effect. ECDSA headers are
32 bytes of `r`, 32 bytes of `s`, then one byte of `v`. All values below are decimal.

| Signature | `v` | Header and signing rule |
| --- | --- | --- |
| ECDSA over typed data | 27 or 28 | `r`, `s` and recovery parity plus 27. Sign the SafeTx EIP-712 digest. |
| Prefixed ECDSA (`eth_sign` form) | 31 or 32 | `r`, `s` and the normal 27 or 28 plus 4. Sign the **raw 32 digest bytes** with the EIP-191 message prefix. The run uses viem `signMessage`. |
| Approved hash | 1 | Left-pad the approving owner address to 32 bytes for `r` and use zero for `s`. The owner calls `approveHash(digest)` before a third party relays, as in the run. Safe also accepts this slot when that owner is the executor. |
| Contract owner (ERC-1271) | 0 | Left-pad the contract owner address to 32 bytes for `r`. Put the byte offset to the dynamic signature tail in `s`, counted from the first byte of the whole signature blob. After the sorted headers, append the tail as a 32-byte length followed by the contract's signature bytes. For two headers and one contract signature, the offset is 130. |

A Safe acting as a contract owner uses its CompatibilityFallbackHandler. The
inner Safe's owners sign `SafeMessage(bytes message)` with the **inner** proxy as
the verifying contract and the outer SafeTx digest as the raw 32 bytes of
`message`. Pack the inner signatures in ascending owner order and use them as
the outer contract slot's dynamic payload. The same wrapping also lets a Safe
sign the spike module's own EIP-712 digest for OpenZeppelin's
`SignatureChecker.isValidSignatureNow`. [Safe 1.5.0 contract](https://github.com/safe-fndn/safe-smart-account/blob/dc437e8fba8b4805d76bcbd1c668c9fd3d1e83be/contracts/Safe.sol),
[CompatibilityFallbackHandler](https://github.com/safe-fndn/safe-smart-account/blob/dc437e8fba8b4805d76bcbd1c668c9fd3d1e83be/contracts/handler/CompatibilityFallbackHandler.sol),
[Goal 4 run](evidence/goal-4.txt)

The Anvil run paid once through each signature format. Reversed owner order,
a typed-data signature with `v=2`, and a replay after the Safe nonce advanced
each mined a reverted transaction and decoded as `GS026`. The replay uses the
identical old calldata and signature blob. Safe recomputes the signed hash with
its current nonce, so the old signatures fail the owner validation.
[Signature run](evidence/safe-signatures.txt), [Runnable checks](script/safe-signatures.ts)

## Measurements

These are receipt gas totals from one clean Anvil run. The calls use
different calldata and storage states. The approved-hash path shows the cost
of the separate approval as well. [Anvil receipts](evidence/anvil.txt)

| Transaction | Gas used |
| --- | ---: |
| Direct budget spend after rollover | 94,430 |
| Relayed budget spend | 115,435 |
| Hat module enable by a 2-of-3 Safe | 103,666 |
| Person budget creation by the Safe | 157,921 |
| SafeTx with typed-data ECDSA | 65,609 |
| SafeTx with prefixed ECDSA | 66,064 |
| SafeTx with an approved hash | 64,120 |
| Separate `approveHash` call | 52,626 |
| SafeTx with an ERC-1271 owner | 111,058 |
| Goal 4 module call with a Safe as signer, A4 | 90,824 |
| Goal 4 direct call through the Safe, A5 | 93,375 |

| Check | Time |
| --- | ---: |
| Full `forge test` command, including the invariant | 2.104 s |
| Real-module invariant suite | 1.94 s |
| Mutant command, including shrinking | 2.241 s |
| Whole Anvil script, including process shutdown | 3.489 s |

[Forge suite timing](evidence/forge-test.txt) · [Mutant timing](evidence/mutant.txt) · [Runner log](evidence/run-all.txt)

## The decision it supports

None is decided yet. The stage-three budgets recommendation puts budget enforcement, hat authority and
payout truth on chain. It uses D1 for app records and a read copy for
display. The signature workflow remains open for the workflows spike.
[Draft recommendation](../../design/decisions/ST3-budgets.md)

## Open risks

- Fixed periods use `block.timestamp / periodSeconds`, so they align
  with 1970. Calendar months and grant anchors depend on the time
  milestone. [Calendar anchors](../../design/decisions/K23-time.md#4-calendar-anchors)
- Revocation is permanent for a Safe and hat pair. Creating the row again
  returns `AlreadyExists`. [Revocation test](evidence/budget-foundry.txt#L15)
- The fuzz covers direct spends. Relayed spends have Foundry and Anvil
  examples. [Fuzz run](evidence/budget-invariant.txt) · [Anvil relay](evidence/budget-anvil.txt#L17)
- This spike uses Hats v1 from July 2023. Compatibility with newer Hats
  releases remains open. [Pinned releases](versions.json)
- Safe's boolean-only module entry returns true for a token returning
  false. ERC-20 payout modules must use the return-data entry and check
  the token result. [False-returning token](evidence/goal-4.txt#L21)
- The payout tests use standard ERC-20 balances. Fee-on-transfer and
  rebasing behavior remain unverified. Forge also flagged the spend
  event emitted after payment. Event order with callback-capable
  tokens remains untested. [Build output](evidence/build.txt) · [Balance checks](script/budgets.ts)
- A budget can't be in ETH. `createBudget` refuses a token address with no code, which includes address zero, so
  only `HatSpendModule` reaches `SafePayment`'s ETH branch. The feature decides whether native-currency budgets exist.
  [createBudget](src/HatBudgetModule.sol#L49)
- A zero amount is accepted: a zero spend uses up a nonce and emits an event, and a budget may have a zero limit. The
  feature should refuse a zero spend. [BudgetAuthorization](src/BudgetAuthorization.sol#L21)
- `run-all.sh` rewrites the committed `evidence/` files on every run, so a re-run leaves the tree changed. Each run's
  logs carry its local temp paths.

> **TO THE CONDUCTOR**
>
> The Safe and Hats spike (ST3.01) shows that a real Safe pays through an
> enabled module after a Hats check, that a child hat can spend within its
> own budget, and exactly what clients sign for a SafeTx.
>
> The stage-three budgets decision (ST3.02) is drafted for review. The
> evidence informs the journey checks (ST3.03), the Safe and Hats adapters
> (ST3.04), and the budgets feature and fuzz comparison (ST3.05).
> The owner-signature workflow (ST3.06) remains open for the workflows spike.
> [Milestone rows](../../design/milestones.md#L127)
