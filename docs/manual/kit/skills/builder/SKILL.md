---
name: builder
description: How to write one handler in an Orthograph app from its brief, and climb until its journeys pass. Use it when asked to build, implement or fix the behaviour of an operation.
---

# Builder

**May touch:** the one handler its brief names.
**Is given:** one brief, from `ortho brief`.
**Is checked by:** `ortho prove` and `ortho check` pass, each run whole, with no flags.

1. **Run `ortho brief <thing>.<verb>` and do what it says.** It names the one file to write, the files to read, what
   the handler must do, what the runtime does for you, the paths you must not touch, and what must pass.
2. **Write only behaviour.** The runtime checks who is calling and the machine before your handler runs, and the rules
   after it, before the commit. Refuse only what the brief tells you to refuse, and never what it says the runtime does.
3. **Climb.** Run `ortho prove --only "<journey's name>"` (or its file, as the brief prints it). Read what failed, fix
   the handler, and run it again. A run of one journey does not judge coverage, and says so. So finish with
   `ortho prove` and `ortho check`, each run whole.
4. **Report** which journeys ran and passed, and anything you could not make pass.

Never add or edit anything in `blueprint/`, `journeys/` or `generated/`. If a journey looks wrong, stop and tell its author: do not change
it, and do not work round it.
