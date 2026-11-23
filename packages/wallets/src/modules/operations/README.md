# operations

`Operations.on(signerOf)`: what `create`, `import`, `keys`, `sign` and `send` do, once, for every host. A host entry
(`src/wallet/<verb>.<host>.ts`) is one line: it names how that host finds a signer (`NodeHost.signer`,
`BrowserHost.signer`, `WorldHost.signer`) and the five operations follow.

- Answers are CAIP-10 accounts (`eip155:<chain>:<address>`) and the wallet's `wal_` id.
- A signer name that is none of `node`, `browser`, `keystore`, `world` is `KeyLocked`, said in a log first.
- `send`'s `to` must be an account on the chain the signer is on; another chain or a malformed account is refused as
  `SimulationReverted` before anything is prepared.
- A device waits on the real clock (`TimersLive`); a world's clock is not its business.
- A secret key (`import`'s `source`) enters as `Redacted` at the first line and is never logged, answered or put in a fault.
