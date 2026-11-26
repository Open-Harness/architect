# add

`ortho add thing | operation | read | journey <name>` plans the files for a new declaration, each gap a
`Blueprint.todo` that compiles and that `ortho check` names. It never overwrites: if any file is there, it writes
none. `--dry-run` prints what it would write. The module only plans; `main.ts` writes.

`ortho add journeys <thing>` (K16 e) writes a journey stub to `blueprint/journeys/<thing>-<verb>-<path>.ts` for every path
through the thing's machine, allowed and refused, then for each operation and read by name one per allowed role no
machine stub casts, one caller turned away, and one per declared error (`renderJourneyStubs`, in
`@orthograph/projections`). Unlike the other kinds it writes the stubs that are missing and names the ones already
there, refusing only when every one is: after the machine grows, it writes just the new paths.

`ortho add thing --from-doctype <file> [--asset <name>]` (`design/decisions/CX-from-doctype.md`) scaffolds a thing, its
machine (ERPNext's docstatus when it is submittable, else `active`), events, a verb per move and `get` from an ERPNext
doctype's JSON, a line (`parent`, `idx`) per child table read from beside it, and a `<Target>Link` value per record
type it links to that isn't scaffolded. Who may act is the only blank. It refuses whole (exit 2, nothing written): a
field type with no mapping, a missing table file, Currency with no asset, more than 100 columns, a thing already there,
no refusal code left. `internal/doctype-read.ts` reads the JSON, `doctype-names.ts` names it, `doctype-fields.ts` maps
the fields, `doctype-render.ts` writes the files and `doctype-plan.ts` plans against the project's model.
