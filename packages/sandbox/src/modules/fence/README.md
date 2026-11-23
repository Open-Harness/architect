# fence

The sandbox's one path rule (GOAL17-check-harness, call 4; K10 section 3): the `realpath` of the target's nearest existing
parent, compared case-folded, must lie under the `realpath` of the sandbox's root. `..`, an absolute path elsewhere, a
symbolic link out and a differently cased path on a case-insensitive disk are all refused as `OutsideSandbox`.

`Fence.of(disk, root)` makes the fence of one root; `fence.check(target)` answers the absolute path to use, or fails. `refusalText`
is the line a Pi tool's error result starts with, `OutsideSandbox: <path> is outside <root>`, which the model reads.

Honestly stated, as the prototype states it: this covers the bridge's own file calls, an `exec`'s `cwd`, and the paths a
Pi tool sends over the socket (the relay checks each). A program run by absolute path can still write elsewhere: the fence
is a default, not isolation, which is E2B's. Test: `fence.test.ts`, on a real disk with a real symbolic link.
