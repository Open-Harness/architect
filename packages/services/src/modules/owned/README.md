# owned

`Owned.start({ kind, binary, args, log, ready })`: a process of the caller's scope (K10 section 8, M1.33). It is a child of
this one with a minimal environment (`PATH`, `HOME`, locale: nothing of the shell's keys), its output in a file, ready once
`ready` answers, and stopped when the scope closes: SIGTERM, up to five seconds, then SIGKILL, and its marker removed.

Each process leaves a marker `<kind>-<pid>.json` in the run folder (`ORTHO_RUN_DIR`, else `~/.cache/orthograph/run`):
its PID, its owner and the command it was started with. A marker is a claim. A PID is signalled only while `ps` still shows
that command, so a PID some other program has since been given is never touched. `@orthograph/prove` writes the same markers
for the Collector.

`Owned.leaks(dir?)` and `Owned.sweep(dir?)` are what a gate's teardown uses: point `ORTHO_RUN_DIR` at a folder of the
gate's own, run, then every marker that still names a live process of that command is a leak (stopped by `sweep`).
No `docker ps`, no names: owned PIDs.

Test: `owned.test.ts`.
