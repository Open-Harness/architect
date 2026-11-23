# K13: lock down what exists first

> **Renamed by K15** (19 November 2026, Aaron): the example app is **Plugged In** (`plugged-in`), no longer `links`. Where this record says "the links app" or
> `examples/links`, read Plugged In and `examples/plugged-in`. See [`K15-plugged-in.md`](K15-plugged-in.md).

Decided 19 November 2026 by Aaron, with the conductor. His words: "I don't think that this is the critical part… the
critical path is locking down and understanding what we have right now. Being able to actually run the generator,
build a blueprint, see the blueprint in the portal. Make sure that when you actually generate the thing, the
different languages render properly… All of this other stuff like the approvals, what the agent can and can't do… is
kind of like not on the critical path." And: "there should be a new built in example for a link tree style app; we
should dog food that." He agreed the plan below ("that looks solid").

## The answer

The critical path to Gate M1 becomes: one links app (M1.40), a check that runs the whole loop through the real `ortho`
command and reads every output for the basics (M1.41, written first by a different agent), links' handlers (M1.43) and the fixes it turns red
(M1.42), with M1.35 and M1.36 beside them, and then the portal as a viewer (M1.13). The actions, approvals, the
agent's chat and the agent's way in move to M3, ids unchanged, and leave both M1's gate and the path to workable.

## Why: the basics, traced in the code

The generator audit (K12) graded each building block against each output. Read in the code on `origin/m1`:

- **Operations and reads are green only as wrappers.** The SDK has one function per operation calling the API
  (`generators/src/modules/render/internal/sdk.ts:23`), the CLI one command per operation with a flag per payload
  field (`cli.ts:6-31`), MCP one tool per operation (`mcp.ts:21`). All three import the one generated API declaration,
  so a fix there reaches all three.
- **Things and fields are partly there.** The SDK exports no type for a thing, only `client`, `layer` and `Errors`
  (`sdk.ts:132-134`); every CLI flag is text (`cli.ts:9`), with no help from the field's description, and answers print
  whole (`cli.ts:78`); the portal's field carries only `value`, `named`, `ref` and `optional`, with no description or
  visibility (`portal/src/modules/wire/types.ts:12-17`).
- **Events and errors are the real holes.** The API exports `Events` (`projections/…/api/internal/api.ts:127`) but the
  SDK does not; the portal knows an event only by name (`emits: string`, `wire/types.ts:43`) and an error only by name,
  with no code (`errors: string[]`, `wire/types.ts:44`), though the API has the codes (`api.ts:56`).
- **Steps** rightly never reach the SDK, CLI or MCP (they run inside the handler); the portal gets only each step's
  name and type (`wire/types.ts:47`).

| Building block | SDK | CLI | MCP | portal | telemetry |
|---|---|---|---|---|---|
| Thing and fields | ~ no thing type | ~ untyped flags, no help | ~ no output schema | ~ no visibility or description | ~ public only (M1.35) |
| Operation and read | ✓ | ✓ | ✓ | ✓ | ✓ |
| Step | ✗ by design | ✗ by design | ✗ by design | ~ name and type only | ✓ |
| Event | ✗ | ✗ | ✗ | ~ name only | ✗ (M1.36) |
| Error and code | ✓ | ~ | ~ | ~ no codes | ~ (M1.36) |

M1.41 turns each ✗ and ~ that matters red; M1.42 makes it pass.

## What changes

| Was | Now |
|---|---|
| The path ran M1.35 → M1.12 → M1.23 → M1.24 → M1.13 | M1.40 → M1.41 → M1.43 and M1.42, with M1.35, M1.36 and M1.34, → M1.13 |
| M1.12: sdk, cli and mcp as plugins, and the SDK contract | M1.12 keeps the SDK contract (typed refusals, `requestKey`, the caller); the move into plugins is M3.22 |
| M1.13 needed the shell (M1.24), and carried faces and notes | the portal as a viewer in the shell's frame; faces and notes are M3.21 |
| M1.22, M1.23, M1.24, M1.37 in M1; ST1.05 in stage 1 | in M3, ids unchanged; Gate M3 needs them, Gate M1 and Gate M2 don't |
| The canon's first example: the sign-up sheet, then ticketing | the links app, all the way through (the canon thread's pass) |

**Amended 20 November 2026:** the move into `@orthograph/projections` landed with M1.12, because check 14 (M1's gate) requires the clients as projections; M3.22 keeps only what is left of plugins.

M1.24 keeps the chat, "Needs you" and screen context; its frame (tree, top bar, live rail, drawer) is now M1.13's.
M3.17 and M4.23 now need M3.21 for faces.

**Changed by K16, 19 November 2026** ([`K16-the-scaffold-explains-itself.md`](K16-the-scaffold-explains-itself.md)): the path is
now M1.40 → M1.41 → M1.43 and M1.42, with M1.44 (the scaffold explains itself) → M1.45 (journey stubs) before M1.43, so
Plugged In's handlers are written from the new scaffold and its journeys start from the stubs; M1.35, M1.36 and M1.34
beside them, → M1.13. Aaron put it on the critical path that day.
Later the same day, after Aaron's "make sure this is handled" on K16's pre-handle list, M1.46 (the runtime hands in
what it read and refuses what is missing) joins them before M1.43, and M1.47 and M1.48 go beside, all in Gate M1.

## Reversible

Every moved row keeps its id. M1.22, M1.23, M1.37 and ST1.05 keep their text too, so moving one back is one table edit.
M1.12, M1.13 and M1.24 were split, not moved: M1.12's plugin part is M3.22, M1.13's faces and notes are M3.21, and
M1.24's frame is M1.13's; undoing a split means merging the two rows' text back. Nothing built is removed.

After review: M1.41 checks the portal's data file, and opening the portal is M1.13's check (so M1.42 can pass before
M1.13 exists); Gate M2 and M2.08 no longer go through actions, which are M3's; and M1.43 writes links' handlers
against M1.41, because M1.40 is declarations only and the loop must commit real calls.
