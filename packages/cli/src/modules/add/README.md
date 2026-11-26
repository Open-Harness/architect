# add

`ortho add thing | operation | read | journey <name>` plans the files for a new declaration, each gap a
`Blueprint.todo` that compiles and that `ortho check` names. It never overwrites: if any file is there, it writes
none. `--dry-run` prints what it would write. The module only plans; `main.ts` writes.

`ortho add journeys <thing>` (K16 e) writes a journey stub to `blueprint/journeys/<thing>-<verb>-<path>.ts` for every path
through the thing's machine, allowed and refused, then for each operation and read by name one per allowed role no
machine stub casts, one caller turned away, and one per declared error (`renderJourneyStubs`, in
`@orthograph/projections`). Unlike the other kinds it writes the stubs that are missing and names the ones already
there, refusing only when every one is: after the machine grows, it writes just the new paths.
An operation or a read that still has a blank is not in the model's operations (#742), so it gets no stub: the
command names each one, its file and how many blanks it has, and when that leaves nothing to write it says so and exits 2.

`ortho add journey "<title>"` writes a stub whose cast and steps are both blanks. The compiler lists them like any other
blank, and prove skips the journey, naming it, until they are filled.
