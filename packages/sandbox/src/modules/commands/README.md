# commands

Blocked commands (GOAL17-check-harness, call 4). Settings' `blocked` is a list of program names, never a path or an argument
(`InvalidBlocked` otherwise). Two layers refuse one, and each says `BlockedCommand: <name>` and exits 126:

- `firstBlocked` judges an `exec` call's first word before anything starts: `["sudo", "ls"]` is refused, `["echo", "sudo"]` is not.
- `install` writes a directory of shims, one per blocked name, which the bridge puts first on every process's `PATH`. A shell
  string that runs `sudo` by name finds the shim, which prints the name, logs it in `hits`, and exits 126. `hitsFrom` reads the log.

Not a security boundary: a program run by its absolute path skips the shims (the prototype's "defaults" caveat; E2B is the real wall).
Test: `commands.test.ts`, which runs a real shell against real shims.
