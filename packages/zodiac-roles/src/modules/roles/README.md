# roles

`Roles`: Roles 2.1.1's calls, reads and refusals for one Safe's modifier.

- `deploy`: `ModuleProxyFactory.deployModule(ROLES_MASTERCOPY, setUp(abi.encode(safe, safe, safe)), saltNonce)`, and the
  address the factory deploys at: the EIP-1167 proxy of the mastercopy, by CREATE2 from the factory, salted with
  `keccak256(keccak256(initializer) ++ saltNonce)`.
- `budgetCalls`: an `OrgBudget` as calls on the modifier, for the Safe (its owner) to make in the implementation's order:
  `setAllowance` (timestamp 0, so the modifier takes the block's), `scopeTarget`, `scopeFunction`, then `assignRoles`
  for each member. Every call has value 0, and the function is scoped with no value and no delegate call (ExecutionOptions
  None, chosen here: the implementation leaves it to the SDK's default). A parameter is an input's index or
  `[input, component]`, a field of a tuple input, as V3 `send`'s item is. The tree under the calldata's `Matches`: the amount
  `And(LessThan(limit + 1), WithinAllowance(key))`, or `WithinAllowance(key)` with no limit; the recipient `EqualTo`, or an
  `Or` of them; the token `EqualTo`; every other input or field `Pass`, `Static` or `Dynamic` as its type is; a tuple holding
  scoped fields a `Matches` of its own. Listed breadth first, an `And` or an `Or` with paramType None (Integrity refuses
  anything else). Refused as `configuration`: a parameter `fn` does not have; an amount that is not a `uint<N>`, a recipient
  or a token that is not an `address`; two on one place; an array (of any size) or a tuple inside a tuple anywhere; a tuple
  input with nothing scoped in it; no recipients, a recipient or a member listed twice; a limit of 2^256 - 1. No members is
  allowed: the implementation assigns them in a call of its own.
- `execTransactionWithRole`: a Call (operation 0), `shouldRevert` true unless given.
- `allowance`: `allowances(key)` read over the chain port. Roles stores a `maxRefill` of 0 as `type(uint128).max`.
- `accrued`: Roles' own accrual. Before a whole period has passed since `timestamp`, the balance; then the balance plus
  `refill` for each whole period, capped at `maxRefill`; a balance already at or over `maxRefill` stays as it is. A `timestamp` an owner set in the
  future holds the balance until a whole period after it.
- `refusals`, `refusalOf`: one lock entry per error in Roles 2.1.1's ABI, and the typed refusal. A stranger who was never
  assigned a role is `NotAuthorized` (not one of the modifier's modules); a member using a role it does not hold is
  `NoMembership`.

Tests: `roles.test.ts` and `budget-calls.test.ts` (no chain), and `budget.test.ts` (Anvil). `internal/fixtures/` is the checks' own world, never
shipped: a Safe 1.4.1 from its pinned bytecode, a test token, and the Roles modifier with a budget on it.
