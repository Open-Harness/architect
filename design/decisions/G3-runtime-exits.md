# G3: the runtime's exits are 0 to 4 and 120 to 125

Decided 19 November 2026 by the Goal 3 lead, under "Who decides" in `AGENTS.md`, for ledger `HAN-10`.

## The problem, in code

K16 gave the runtime five exits and the blueprint the rest up to the shell's limit:

```ts
// packages/compiler/src/modules/model/internal/exits.ts:7
export const RESERVED_EXITS: ReadonlyMap<number, string> = new Map([
  [0, "success"], [1, "a defect"], [2, "InvalidPayload"], [3, "NotAllowed"], [4, "NotFound"],
]);
const LOWEST = 5;
const HIGHEST = 125;
```

HAN-10 makes `IdempotencyConflict` (a reused request key with another payload) a typed built-in refusal, so it needs
an exit of its own that no declared refusal can take. 0 to 4 are full. The check's first draft took 5, the lowest
declared exit: the first one an author reaches for, and the one the design pages draw (`design/walkthrough/journey.md:278`,
`design/portal.md:592`). No blueprint in the repository declares 5 today (`git grep "exit: 5"`), but K16 promised it to
blueprints, so taking it breaks that promise for every project outside this repository, and the next runtime refusal
would move the floor again. (An earlier draft of this record said acme's `AllowanceExceeded` is 5;
it is 41. Corrected after the 🔍 review of #116.)

## The call

The runtime keeps **0 to 4 and 120 to 125**. A declared exit is **5 to 119**. `IdempotencyConflict` is **120**; 121 to
125 are held for the runtime's next refusals (none named yet). No blueprint, fixture or canon page declares an exit of
100 or more (`git grep` on `5d2887ca`), so nothing changes but the compiler's range and its message:
`AllowanceFrozen's exit 122 is the runtime's; pick another` and `… outside 5 to 119, which are the blueprint's`.

| Option | Breaks | Room for the next runtime refusal |
|---|---|---|
| 5, declared from 6 | K16's promise of 5 to every project, the design pages that draw it | moves the floor again |
| share 2 or 3 | the CLI can't tell two refusals apart (the clash K16 was written to stop) | none |
| **120 to 125 held, declared 5 to 119** | nothing today | five more |

## The rest of `IdempotencyConflict`'s row

Code `AR-002` (the runtime's prefix `AR`, after `NotAllowed`'s `AR-001`), HTTP status `409` (a clash with what the
server already holds, as the machine's not-from refusal), no fields (the stored key is the runtime's, never the
caller's to read), listed on idempotent operations only. MCP can't reach it yet: a tool call carries no request key
(ledger `HAN-10`'s note, snag S-16).

## In prove's coverage line

Prove's eval 8 summary counts "runtime refusals" from each operation's `refusals` less its declared errors. With `IdempotencyConflict` on every
idempotent operation that count would include a refusal no journey can cause: it needs a second payload under a held request key, and a journey
step has no way to send one, so it would stay uncovered for ever and layer 1's checks 02 (acme, `14/17`) and 08 (signup, `2/4`) would fail for good.
The call (the lead, 20 November 2026): runtime-refusal coverage counts only the refusals a journey can cause. `NotAllowed` stays in (a step names a
caller who may not call). Every refusal the model codes under the runtime's prefix (`AR`, read from `NotAllowed`'s code) other than `NotAllowed` is left
out, so `IdempotencyConflict` is, and the names come from the model, not a list in prove. The line keeps its totals and says what it left out, after
them: `runtime refusals 14/17 (not counted: IdempotencyConflict, which no journey can cause: …)`, only when an operation lists one. `InvalidPayload` is
in no operation's `refusals`, so there is nothing to leave out. Checks 02 and 08 keep their totals and build the expected line from the model (`coverageLine`): the suffix is required exactly when an operation lists `IdempotencyConflict`, and forbidden otherwise, and they pin that literal name besides.

## In the scaffold's header

A scaffold header lists `IdempotencyConflict` on an idempotent operation, as the last of its `refusals` (the model's order: the declared
errors, the machine's, then the runtime's own in the order the runtime tries them, `NotAllowed` and then `IdempotencyConflict`), as the runtime's:
exit 120, `AR-002`, "the runtime's, when the same request key comes with another payload", `from` the operation's own file, where it declares
`idempotent`. K16 a.4 lists `op.refusals` in order and that list already holds `NotAllowed`; this record's own reason, that a handler can
neither make nor avoid it, applies to `NotAllowed` as much, so the header says it and does not filter it out. `allowance-spend.ts.golden` is
the only golden of an idempotent operation's header; the columns widen by one (`IdempotencyConflict` is the longest name, `exit 120` the longest exit).

## What changes

Every place that said "5 to 125", found by `git grep 125` on `5d2887ca`, moves in the same change as HAN-10:

| Where | Who changes it |
|---|---|
| `K16-the-scaffold-explains-itself.md:331`, `M1-plugged-in.md:39`, `M1-prehandle.md:97`, `milestones.md` M1.47 | the lead: amended in place, citing this record |
| `e2e/m1/19-scaffold-explains.test.ts:184`, `e2e/m1/22-k16-review.test.ts` (22.5), and check 24's refusal of a declared 120 | the checks author |
| `packages/compiler/src/modules/model/internal/exits.ts` (`RESERVED_EXITS`, `HIGHEST`) and its unit test `exits.test.ts:18` | the HAN-10 builder |

No canon page states the range. Before HAN-10 merges, `git grep "5 to 125"` on its head finds only dated records.
- HAN-10's check (`e2e/m1/24-idempotency-conflict.test.ts`) asserts exit 120, code `AR-002`, status 409.
