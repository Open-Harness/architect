# anvil

`Anvil.start({ chainId?, port?, accounts?, balance?, binary? })`: Anvil as a process of the caller's scope, for a
world's chain (`Stand.process`, M1-plugins section 9; K7 Q7). Ready once `eth_chainId` answers; killed and waited for
when the scope closes, so a world that ends leaves no process and no port.

Owns:
- **Always `--silent`**, on `127.0.0.1`, with `--accounts 0`: Anvil's own public dev keys are never made.
- **The world makes the keys.** Each account's key is generated here (`viem/accounts`), kept as `Redacted`, and its
  address funded over `anvil_setBalance`. No key is in an argument, an environment variable, a file or anything
  Anvil printed. Anvil's environment is an allowlist (`PATH`, `HOME`, locale), so nothing of the shell's reaches it.
- `printed()` returns what Anvil wrote to stdout or stderr (bounded). With `--silent` it is empty.

Anvil is a plain process locally and in CI (K10 section 8): CI installs Foundry at a pinned version, with no
container and no Docker step.

Test: `anvil.test.ts` runs a real Anvil, so it is skipped unless `ORTHO_CHAIN_EVM_ANVIL=1` (`ORTHO_ANVIL_BIN` names
another binary than `anvil` on PATH). The argument list is tested without Anvil.
