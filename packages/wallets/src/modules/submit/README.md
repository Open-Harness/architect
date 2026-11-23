# submit

`Submit.withKey` and `Submit.withProvider`: one transfer through K7 Q3's lifecycle on the `@orthograph/chain-evm` port:
prepare, **simulate** (never skipped: the port refuses to sign or submit what has not simulated, M1.32), sign, submit,
follow to inclusion.

Both take the signer's shared port (`Chain.shared`) and never make one: sends from one signer share its nonce lane, so
overlapping sends take distinct nonces.

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

A browser signer also asks its wallet `eth_chainId` right before `eth_sendTransaction` and refuses a mismatch with the
setting's chain (`KeyLocked`, the two chains named in the log), so a network switch during simulation is caught.
