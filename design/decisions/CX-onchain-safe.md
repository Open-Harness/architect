# CX-onchain-safe: Capxul's on-chain account is a Safe, and nothing else for now

**Status: decided, 26 November 2026, by Aaron.** Recorded by Goal 16's 📐 designer thread at the lead's request.

## Aaron's words

On 26 November 2026 Aaron asked whether outside contracts (a Safe, a plain ERC-4337 account, an Aragon DAO) could come
into Capxul through one adapter interface written in the blueprint language, and asked for research with
recommendations. The same day, before any of it was written, he dropped it. His words, kept as heard:

> "Let's just drop it all together. I think I don't want to complicate things, actually ... We're just going to use
> safe, and we're just going to drop everything else for now. Right? If anything, we would have a safe and like a plain
> 4337 and swap between them ... But other than that, I think we'll just drop it."

## The reading

1. **Capxul's on-chain account is a Safe.** Each person's and each company's account is a Safe, as `M7-capxul.md`
   already says ("every account is a Safe, personal or company"), reached through the planned `safe` adapter (ST3.04).
2. **Nothing else is designed or built for now.** No adapter layer for outside contracts in general, no shared
   "company account" interface, no wrapper contracts, and no Aragon.
3. **A plain ERC-4337 account is possible later,** as an alternative a build could swap in for the Safe. It is noted
   here only; it is not designed, and nothing waits on it.

## What this leaves unchanged

- K25, the blueprint on chain, including item 7: an organisation is not on chain, and a Safe is someone else's
  contract behind the `safe` adapter.
- The planned `onchain-pay` piece (Superseded by CX-features, 26 November 2026: "the planned `onchain-pay` feature") in `CX-composable-pieces.md` (each person's and company's Safe, and getting paid by
  a link).
- Goal 16's slice 2, "The Safe and getting paid on chain, later with the chain" (`design/goals/16-capxul.md`).

## Supersedes

Nothing: no decided words change.
