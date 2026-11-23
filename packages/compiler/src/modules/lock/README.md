# lock

Owns `blueprint/refusals.lock` (M6-chain item 4): every refusal of the project with the code it keeps for good, the
file `ortho generate` writes and only ever adds to. `evolve` follows the blueprint: a name keeps its code (reordering
declarations changes nothing), a new name takes its thing's next unused number (never one used before, and never 900 or
901, the machine's and not-found's), a name that left the blueprint is retired as it was, and a renamed refusal's old
wire identity moves to `earlier`. The compiler reads the lock, so the model's `refusals` map and every generator read
codes from the model and never work one out. The runtime's refusals are the lock's too: AR-001 and AR-002 always,
AR-003 to AR-006 when the project has a chain store. Test: `lock.test.ts`; the whole file, against real projects, in
`e2e/on-chain/04-m6-10-*`.
