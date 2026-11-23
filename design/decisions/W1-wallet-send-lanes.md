# W1-wallet-send-lanes: no nonce state outlives a send, the process shares one lock per account, and a wallet sends only on its own chain

Goal 3's lead, 23 November 2026. A goal's own call, named by slug (K32). This came from two Codex findings on #602,
the M1 preview, and is fixed in #616.

## The problem

`@orthograph/wallets` could move money wrongly in two ways:

1. **The browser wallet sent on whatever chain it was on.** `provided.ts` checked and simulated the send against the
   configured chain (`ORTHO_WALLET_CHAIN`), then called `eth_sendTransaction` without asking the wallet's own
   `eth_chainId`. A wallet switched to another network sent the money there.
2. **Overlapping sends from one account could take the same nonce.** Every send builds a new `@orthograph/chain-evm`
   port, and each port has its own nonce manager. Two sends at once could each reserve the same nonce, and the chain
   refused one of them. Every host (`NodeHost`, `WorldHost`, `BrowserHost`) builds a new signer per call, so state kept on
   a signer is not shared either. Keeping a shared port was tried in three rounds on #616 and each time its nonce state
   outlived a send and drifted from the chain (an interrupted send, a failed first build, a lost broadcast).

## Decided

1. **A wallet sends only on its own chain.** Just before `eth_sendTransaction`, the browser signer asks `eth_chainId`.
   If it isn't the configured chain, the send is refused with `KeyLocked`, naming both chains, and nothing is sent.
2. **No nonce state outlives a send.** Every send makes its own port with `Chain.port(setting)`, so `prepare` reads the
   pending nonce from the chain. Nothing kept in the process can drift from the chain, whatever happened to an earlier send.
3. **The process shares only a lock.** `chain/internal/lanes.ts` holds a `Semaphore(1)` per
   `${chainId}|${rpcUrl}|${from.toLowerCase()}`, looked up or made in one step, and `Submit.withKey` holds it from `prepare`
   until `submit` returns (the node has accepted the broadcast), then follows the transfer outside it. The next send's
   port then reads a pending nonce that counts the one before. A reservation not broadcast is handed back on any exit that
   is not a success, as tidiness on a port being thrown away. A world's Anvil has its own `rpcUrl`, so worlds stay apart.
4. **The browser path takes no lock.** A real wallet picks and queues its own nonces, and a lock held across a person's
   approval could hang every later send. The world's test wallet (`world/internal/provider.ts`, made once per world)
   serialises its own `eth_sendTransaction` with its own `Semaphore(1)`, as a real wallet's queue does.
   `withProvider` simulates on its own throwaway port.
5. **This module-level state is allowed.** The rule against ambient globals is about hidden configuration and I/O. A
   lock map is shared state by its nature, holds no nonce, port or key, and is reached only through `Chain.lock`.
   `BrowserHost` already keeps the page's labels in module-level `memory` the same way.

## Evidence

- Tests that fail without the fix, and were written before it by an author who didn't build it:
  - `packages/wallets/src/modules/signer/send-safety.test.ts`
  - `packages/wallets/src/modules/submit/nonce-lanes.test.ts`
  - `packages/wallets/src/modules/world/nonce-lanes-world.test.ts`
  - `packages/wallets/src/modules/submit/first-failure.test.ts`
  - `packages/wallets/src/modules/submit/interrupted-send.test.ts`
  - `packages/wallets/src/modules/submit/lost-broadcast.test.ts` (a connection cut on `eth_sendRawTransaction`, and
    `anvil_dropTransaction`)
- The 🔍 on #616 found that each kept-port design wedged on a case the one before missed; the lock design keeps no nonce.

## Open

- **Lanes across processes.** Two processes sending from one account still each have their own lane. Only the chain's
  pending count is shared between them. A server that runs several processes for one key needs a shared lane,
  which is later work (`design/later.md`).
- **A stuck transaction.** An underpriced transaction in the mempool blocks every later nonce on any design. That is what
  `replace` is for (a higher fee on the same nonce); the wallet does not do it by itself.
