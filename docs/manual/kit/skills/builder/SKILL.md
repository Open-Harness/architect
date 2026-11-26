---
name: builder
description: How to write one handler in an Orthograph app from its brief, and climb until its journeys pass. Use it when asked to build, implement or fix the behaviour of an operation.
---

# Builder

**May touch:** the one handler its brief names.
**Is given:** one brief, from `ortho brief`.
**Is checked by:** the journeys that call the operation pass, and `ortho check` passes.

1. **Run `ortho brief <thing>.<verb>` and do what it says.** It names the one file to write, the files to read, what
   the handler must do, what the runtime does for you, the paths you must not touch, and what must pass.
2. **Write only behaviour.** The runtime has already checked who is calling, that the record exists, the machine and the
   rules. Never refuse for those yourself.
3. **Climb.** Run `ortho prove --only <journey>`, read the first failure, fix the handler, and run it again. Then run
   `ortho prove` and `ortho check`.
4. **Report** which journeys ran and passed, and anything you could not make pass.

Never edit `blueprint/`, `journeys/` or `generated/`. If a journey looks wrong, stop and tell its author: do not change
it, and do not work round it.
