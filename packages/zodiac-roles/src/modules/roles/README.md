# roles

`Roles`: Roles 2.1.1's calls, reads and refusals for one Safe's modifier.

- `deploy`: `ModuleProxyFactory.deployModule(ROLES_MASTERCOPY, setUp(abi.encode(safe, safe, safe)), saltNonce)`, and the
  address the factory deploys at: the EIP-1167 proxy of the mastercopy, by CREATE2 from the factory, salted with
  `keccak256(keccak256(initializer) ++ saltNonce)`.
- `budgetCalls`: an `OrgBudget` as calls on the modifier, for the Safe (its owner) to make. Every call has value 0; the
  function is scoped with no value and no delegate call; `setAllowance` passes timestamp 0, so the modifier takes the
  block's. A parameter index that `fn` does not have, or one that is not a static type, is a `ChainFault`
  (`configuration`).
- `execTransactionWithRole`: a Call (operation 0), `shouldRevert` true unless given.
- `allowance`: `allowances(key)` read over the chain port. Roles stores a `maxRefill` of 0 as `type(uint128).max`.
- `accrued`: Roles' own accrual. Before a whole period has passed since `timestamp`, the balance; then the balance plus
  `refill` for each whole period, capped at `maxRefill`; a balance already at or over `maxRefill` stays as it is.
- `refusals`, `refusalOf`: one lock entry per error in Roles 2.1.1's ABI, and the typed refusal. A stranger who was never
  assigned a role is `NotAuthorized` (not one of the modifier's modules); a member using a role it does not hold is
  `NoMembership`.

Tests: `roles.test.ts` (no chain) and `budget.test.ts` (Anvil). `internal/fixtures/` is the checks' own world, never
shipped: a Safe 1.4.1 from its pinned bytecode, a test token, and the Roles modifier with a budget on it.
