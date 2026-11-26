# refusal

`SafeRefusal` types a Safe's own reverts. Safe 1.4.1 reverts with `require(…, "GS0xx")` strings, which all share the
`Error(string)` selector, so neither chain-evm's refusal lock (keyed by selector) nor the generated `Safe` module
(`src/generated/`, A1's shape: only custom errors become classes) can tell them apart. `SafeRefusal.from` reads the revert
bytes a `ChainFault` carries (`raw`) and answers `SafeRefused { code, safe }`; `SafeRefusal.typed(safe)` does it on an effect.

Status: empty handlers until the build lands; `refusal.test.ts` and `../world/contracts.test.ts` are the checks.
