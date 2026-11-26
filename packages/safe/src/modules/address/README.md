# address

`SafeAddress` works out a Safe's address before it is deployed, with the implementation's formula: the initializer
(`setup([firstOwner], 1, SafeModuleSetup, enableModules([Safe4337Module]), Safe4337Module, 0, 0, 0)`), the salt
`keccak256(encodePacked(keccak256(initializer), saltNonce))`, and CREATE2 from the factory of
`encodePacked(proxyCreationCode, uint256(uint160(singleton)))`.

Status: empty handlers until the build lands; `address.test.ts` holds the fixed vectors (S1, #1168, uses the first), and
`../world/world.test.ts` checks the factory deploys there on Anvil.
