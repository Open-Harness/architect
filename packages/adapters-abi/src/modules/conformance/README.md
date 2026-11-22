# conformance

For a contract, the ABI against the deployed code (`ST2-abi-adapters.md`, section 8). `Conformance.run({ abi, errors })` runs every
call the adapter declares against the `ContractChain` it is given and answers a report: what agrees, and each disagreement named
(`function approve`, `no-such-function`). Two passes, probe arguments made from the types (`types.ts` says how):

- **A**, numbers 0: each read must answer and decode; each write is simulated and, if it simulates, sent; its logs must decode as
  the declared events. Each event must be emitted by some write.
- **B**, numbers 1: each write is simulated only; it must simulate or fail as a declared error. An empty revert is a missing function,
  any other revert an undeclared error.

The cloud pass runs the same against the real contract at its address; that is later.
