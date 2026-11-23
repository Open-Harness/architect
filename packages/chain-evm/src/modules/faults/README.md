The viem error mapper distinguishes transport and transaction faults from execution reverts.
Only revert bytes matching a selector from the EVM projection of the refusal lock yield a
`ChainRefusal`. Aliases retain their old wire ABI and the same stable code. Unknown selectors,
panics, malformed payloads and empty reverts yield `ChainFault`. RPC URLs and full viem
messages are excluded from faults and spans.
