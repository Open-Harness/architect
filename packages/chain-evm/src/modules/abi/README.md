# abi

`Abi` is the ABI codec of the port (Ask #471): `encodeCall` makes a call's data, `decodeResult` reads what `ChainPort.read` returned,
`encodeDeploy` makes a deployment's data, and `refusal` turns an ABI `error` item into a `RefusalLockEntry`, so `decodeRevert`
decodes the contract's own errors. Failures are `ChainFault` values, never thrown. The viem ABI types come out of
`@orthograph/chain-evm/device` (`AbiDocument`, `AbiFunction`, `AbiError`, ...), so a caller needs no viem import.

Status: the functions are empty handlers that fail (`Effect.die`); `abi.test.ts` and `../tx/read.test.ts` are the checks, listed in
`expected-failing/` until the build lands.
