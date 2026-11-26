# test-token

`TestToken.deploy(port, signer, { supply })`: the test token deployed into a world's chain, answering its address once
mined. It is an OpenZeppelin 5 ERC-20 (its ERC-6093 errors included) with 6 decimals, like USDC, whose whole supply is
minted to the deployer, who hands it on with `transfer`.

`testing.ts` is the checks' world (a real `Anvil.start`, three keys, a port, and reads that never go through the adapter);
it is test code, not built into the package.

Status: `deploy` is an empty handler; `test-token.test.ts` is the check, listed in `../../../expected-failing/` until the
build lands (#1162).
