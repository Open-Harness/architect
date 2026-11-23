# submit

`Submit.withKey` and `Submit.withProvider`: one transfer through K7 Q3's lifecycle on the `@orthograph/chain-evm` port:
prepare, **simulate** (never skipped: the port refuses to sign or submit what has not simulated, M1.32), sign, submit,
follow to inclusion.

- A transfer whose simulation fails (a revert, a panic, no funds) is `SimulationReverted`. Nothing was signed or sent, the
  nonce is handed back, so the next send takes the nonce this one would have had.
- A signer that would not sign (a locked keystore, a request the person turned down) is `KeyLocked`.
- `confirmed` for a plain transfer means in a block, not reverted, and `depth` blocks deep, the setting's depth (M1.38,
  `ORTHO_WALLET_DEPTH` or the world's `chain.depth`; a local chain is 1). The transfer has no event of its own to wait
  for, so the intent is the transfer itself; the port's `track` counts the blocks. A setting with no depth refuses the
  send as a defect naming `ORTHO_WALLET_DEPTH`, before anything is prepared.
- The send emits a `wallet.send.level` span with `level` (`submitted` or `confirmed`) and `blocks` for each count it
  sees: first `submitted` with 0 blocks, then one per new block, `confirmed` at the depth, where the send answers.
- An unreachable chain, a timeout or a replaced transaction is a defect that says what, never a declared error.

`withProvider` is for a browser's wallet, which signs and sends in one step: the simulation runs here first, so a doomed
transfer is refused before the person is asked to approve it.

**Overlapping sends.** `withKey` takes the account's lock (`Chain.lock`) from `prepare` until `submit` returns, then
follows the transfer outside it, so the next send's own port reads a pending nonce that counts this one. Each send makes
its own port; none is kept. Any exit before the broadcast that is not a success hands the reservation back, as tidiness on a
port being thrown away. `withProvider` takes no lock: a real wallet picks and queues its own nonces, and a lock held across a
person's approval could hang every later send. The world's test wallet queues its own sends, as a real one does. A browser
signer also asks its wallet `eth_chainId` right before `eth_sendTransaction` and refuses a mismatch (`KeyLocked`, both
chains named in the log).
