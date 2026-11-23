# W1-wallet-send-lanes: one nonce lane per chain for the process, and a wallet sends only on its own chain

Goal 3's lead, 23 November 2026. A goal's own call, named by slug (K32). This came from two Codex findings on #602,
the M1 preview, and is fixed in #616.

## The problem

`@orthograph/wallets` could move money wrongly in two ways:

1. **The browser wallet sent on whatever chain it was on.** `provided.ts` checked and simulated the send against the
   configured chain (`ORTHO_WALLET_CHAIN`), then called `eth_sendTransaction` without asking the wallet's own
   `eth_chainId`. A wallet switched to another network sent the money there.
2. **Overlapping sends from one account could take the same nonce.** Every send built a new `@orthograph/chain-evm`
   port, and each port has its own nonce manager. Every host (`NodeHost`, `WorldHost`, `BrowserHost`) also builds a new
   signer per call, so even a port kept on the signer was never shared. Two sends at once could each reserve the
   same nonce, and the chain refused one of them.

## Decided

1. **A wallet sends only on its own chain.** Just before `eth_sendTransaction`, the browser signer asks `eth_chainId`.
   If it isn't the configured chain, the send is refused with `KeyLocked`, naming both chains, and nothing is sent.
2. **The nonce lane belongs to the process, keyed by chain.** `chain/internal/lanes.ts` holds one port per
   `${chainId}|${rpcUrl}` for the life of the process. Every send takes its port from there, whichever signer
   it came from. Sends that arrive before the port exists wait on the same build.
3. **Only success is kept.** A failed build stores nothing, so the next send tries again. A chain that was down
   for a moment doesn't stop the wallet until a restart.
4. **This module-level state is allowed.** The rule against ambient globals is about hidden configuration and I/O.
   A nonce lane is shared state by its nature, in the same way as a connection pool. It is reached only through
   `Chain.shared`, keyed by the setting, and filled inside the send's effect. `BrowserHost` already keeps the page's
   labels in module-level `memory` the same way. A world's Anvil has its own `rpcUrl`, so worlds stay apart.

## Evidence

- Tests that fail without the fix, and were written before it by an author who didn't build it:
  - `packages/wallets/src/modules/signer/send-safety.test.ts`
  - `packages/wallets/src/modules/submit/nonce-lanes.test.ts`
  - `packages/wallets/src/modules/world/nonce-lanes-world.test.ts`
  - `packages/wallets/src/modules/submit/first-failure.test.ts`
- The 🔍 on #616 reproduced both problems through signers built per call, and found them fixed at `c86d099f`. It ran
  three concurrent sends with nonces 0, 1 and 2, a fail-then-recover case, and 300 interrupts with no stale entry.

## Open

- **Lanes across processes.** Two processes sending from one account still each have their own lane. Only the chain's
  pending count is shared between them. A server that runs several processes for one key needs a shared lane,
  which is later work (`design/later.md`).
