# budgets

Goal 4's example (`design/goals/04-on-chain.md`): a Safe lets a member spend a token up to a limit, and the allowance lives
in one budgets contract per network, which any Safe enables (K25, `design/decisions/M6-chain.md`).

What is here is the spec a user writes, from slice 2 (M6.02):

- `blueprint/`: the chain store, the allowance thing (`safe`, `member`, `token`, `limit`, `spent`), its machine (active,
  exhausted, revoked), roles, errors, events, the four verbs (`grant`, `spend`, `revoke`, `get`), two starting worlds and
  the `local` environment.
- `journeys/`: seven journeys, each operation signed by its person. See `journeys/README.md`.
- `src/`: empty. The user role of the DX trial fills it later, with `src/Budgets.sol`.

It cannot compile or run yet: the chain store, `Blueprint.account()`, `who` roles and a cast with wallets arrive in slices 3
to 8 (`design/goals/04-snags.md` lists each). Until slice 12 it is outside the Nx graph (`.nxignore`), so no workspace-wide
lint, typecheck, test or `nx sync` reaches it.

It declares no `mcp` projection: signed operations are out of MCP (`design/frame/examples/allowance-on-chain.md`).
