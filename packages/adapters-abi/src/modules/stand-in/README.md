# stand-in

`StandInContract.deploy({ port, signer, bytecode })`: the stand-in is the contract itself, deployed into the world's Anvil
(`Stand.process`); it answers the address. An ABI adapter ships the bytecode with its source (for `erc20`, `stand-in/bytecode.json`
and `stand-in/Token.sol`). Putting this into `Worlds.start` is Goal 3's, asked when ST2.04 needs it.
