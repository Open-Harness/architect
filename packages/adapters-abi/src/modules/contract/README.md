# contract

One deployed contract as a service, and the two kinds of call every ABI function is (`ST2-abi-adapters.md`, section 3).

- `ContractChain`: the contract's `ChainPort`, its address and, for a write, a `Signer`. The host or the wallet provides it;
  the adapter never makes a key. The port is made with `refusals: Contract.refusals(bindings, address)`, so a contract's own
  revert arrives as a `ChainRefusal` that `read` and `write` map to the declared error class (`ErrorBinding.make`).
- `Contract.read(fn, args, errors)`: `port.read`, then the answer decoded. Never sends.
- `Contract.write(fn, args, errors)`: `prepare`, `simulate` (mandatory, M1.32), `sign`, `submit`; answers the `Submission`. A revert in
  simulation fails as the declared error and nothing is signed: the nonce does not move.
- A revert whose selector isn't the contract's (an unknown error, empty data, a panic) stays `ChainFault`, a defect at the call (M1.30).
- Arguments are an object keyed by the ABI's parameter names.

It uses what Goal 4 is asked for in Ask #471 (`Abi.encodeCall`, `Abi.decodeResult`, `Abi.refusal`, `ChainPort.read`) and imports no viem.
