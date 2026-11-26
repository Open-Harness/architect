# S1's claim journeys, waiting on J1

These are S1's checks for `personal-safe.claim` (design/decisions/CX-safe.md, the person's Safe's machine; #1168). The
claim's proof is the person's EIP-191 signature of "Capxul: claim Safe <saf_…> for <per_…>", and a journey can sign
only once J1 (#1190, `s.<actor>.signs(parts)` and `s.<actor>.signer`) lands. Calling it before then would throw while
`prove` and `ortho check` read the journey, so these files sit here, where prove does not read (it reads only the files
directly in `journeys/` and `blueprint/starting-worlds/`).

When J1 lands in goal/capxul: move `*.ts` here to `journeys/`, `starting-worlds/*.ts` to `blueprint/starting-worlds/`,
fix their relative imports, replace `signing(s.x)` by `s.x`, and delete `support/signing.ts`. They then fail on S1's
blank `claim` handler and pass once it is built. That move is the journey author's (AGENTS.md, "Journeys and checks
come first"), never the builder's.

- `safe-a-person-claims-their-safe.ts`: every refusal of a claim, then a claim that works out the address.
- `safe-a-claimed-safe-keeps-its-address.ts`: what each claim answered, by key and by agent, is what was kept.
- `starting-worlds/ada-and-bo-have-opened-their-safes.ts`, `ada-has-claimed-her-safe.ts`, `both-have-claimed-their-safes.ts`.
