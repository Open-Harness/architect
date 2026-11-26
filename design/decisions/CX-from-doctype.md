# CX-from-doctype: `ortho add thing --from-doctype`, a thing scaffolded from an ERPNext doctype

**Decided 26 November 2026** by Goal 16's ✍️ author for the command (thread started by Goal 16's lead, who decided to
build it now). It lands board item #877 (`erpnext-scaffolder`). Its checks are `e2e/from-doctype/` (this decision's
pull request); a separate builder builds it.

## Why

Capxul takes 485 ERPNext, HRMS and CRM record types (`examples/capxul/doctypes.md`), and 44 are built by hand. The
spike (`spikes/erpnext-doctypes`, #743) showed a script turns a doctype's JSON into things that pass `ortho check`,
and said it should become an `ortho add` kind, writing what the spike writes and leaving who may act blank. Since the
spike, the framework gained most of what it worked around (#742): optional fields and optional references
(`Blueprint.optional`), exact decimals (`Blueprint.decimal`), calendar days (`Blueprint.day`), signed money
(`Blueprint.money(asset, { signed: true })`) and booleans that round-trip (`Blueprint.bool`). So the command maps onto
the framework's own values, not the spike's `values/erpnext.ts`.

Evidence read on `goal/capxul` at 2aaf49f1, by hand in a copy of `examples/starter`:

- A field whose value is an id with a prefix no thing owns is refused by the compiler (`the id prefix "tsu" is no
  thing's own id`). So a link to a record type not yet scaffolded can't be a branded id, as the spike's
  `values/links.ts` made it. It is ERPNext's own form: the target's name, as text (ERPNext keys a record by its name).
- A value file in a folder under `blueprint/values/` is refused (`not a place the blueprint reads`), so the link
  values are flat files.
- `allowed: Blueprint.todo("…")` beside a real payload fails to type-check (TS2322, the spike's snag);
  `allowed: Blueprint.todo<never>("…")` type-checks, and `ortho check` names it as a blank. An operation with a blank
  `allowed` is listed in the model's `blankOperations`, so a check reads its payload only once the blank is filled.
- The server migration makes a table of every field, plus `state` when the thing has a machine and `version` always
  (`packages/projections/src/modules/server/internal/worker-config.ts`). D1 allows 100 columns.

## The command

```
ortho add thing --from-doctype <file> [--asset <name>] [--dry-run] [--root <dir>]
```

- `<file>` is one doctype's JSON, in ERPNext's shape (`fields`, `permissions`, `istable`, `is_submittable`). The
  thing's name comes from the doctype's `name`, so no name argument is given; giving one too is refused.
- Its child tables come with it. A `Table` field's doctype is read from beside the file, first `<dir>/<snake>.json`,
  then ERPNext's own layout, `<dir>/../<snake>/<snake>.json`, where `<snake>` is the name in lower case with `_` for
  spaces (`Tea Menu Entry` → `tea_menu_entry`).
- `--asset <name>` names `blueprint/assets/<name>.ts`, the asset its `Currency` fields count. It is needed only when
  the doctype or one of its tables has a `Currency` field.
- `--dry-run` prints each file as `ortho add` does (`--- <path>` then its content) and writes nothing.
- Like every `ortho add` kind it never overwrites: if any file it would write (other than a link value, below) is
  there, it writes none, and says which.
- One doctype per run, with its tables. Two runs on the same project and the same files write the same bytes.

## What it writes

Names: the thing's folder is the doctype's name in kebab case (`Tea Blend` → `tea-blend`), its export in Pascal case
(`TeaBlend`), each field the `fieldname` in camel case (`blend_name` → `blendName`). Its id prefix is the lower-case
initials of the name's words; under three letters, the letters after the last word's initial fill it to three
(`Tea Blend` → `tbl`, `Company` → `com`, `Sales Invoice Item` → `sii`); while that prefix is another thing's, an `x`
is added (`Tea Menu Entry`, beside `Tea Menu`'s `tme`, → `tmex`). Its refusal `code` is the capital initials, two to
four (one word: its first two letters), lengthened the same way past one already taken. Every file opens with
`// Scaffolded from <file's name>, ERPNext's <Doctype>. Yours from now on.`

**For a doctype** (not `istable`): `blueprint/things/<thing>/thing.ts`, `machine.ts`, `events.ts`, and
`verbs/<move>.ts` for each move and `verbs/get.ts`; no `roles.ts` (below).

- **The thing.** Its `description` is the doctype's, or `<Doctype>, as ERPNext keeps it.` Its fields, in the JSON's
  order:

  | ERPNext field type | Field |
  |---|---|
  | `Data` | `Blueprint.text({ max: 140 })`; with `options: "Email"`, `Blueprint.email()` |
  | `Read Only`, `Attach`, `Attach Image` | `Blueprint.text({ max: 140 })` |
  | `Small Text`, `Text`, `Long Text`, `Text Editor`, `Code` | `Blueprint.text({ max: 65535 })` |
  | `Select` | `Blueprint.oneOf([...])` of its options, one per line, blank lines left out |
  | `Check` | `Blueprint.bool()` |
  | `Int` | `Blueprint.decimal({ places: 0 })` (signed and exact) |
  | `Float`, `Percent` | `Blueprint.decimal({ places })`, the field's `precision` when it gives one, else 9 |
  | `Currency` | `Blueprint.money(<asset>, { signed: true })`: a return is negative |
  | `Date` | `Blueprint.day()` |
  | `Datetime` | `Blueprint.instant()` |
  | `Time` | a value declared in the thing's file, `<Thing><Field>`, text `HH:MM:SS` with optional fractions |
  | `Link` to a thing in the project | that thing's `fields.id`: an edge |
  | `Link` to its own doctype | its own id value, `Blueprint.id("<its prefix>")`, with no edge (a tree's parent, a return's original) |
  | `Link` to a doctype not scaffolded | `<Target>Link` from `blueprint/values/<target>-link.ts`: the target's name, `Blueprint.text({ max: 140 })` |
  | `Dynamic Link` | `Blueprint.refAny()`; the `Link` field naming its doctype is dropped |
  | `Table` | not a field: the child doctype becomes a line (below) |
  | `Section Break`, `Column Break`, `Tab Break`, `HTML`, `Button`, `Heading`, `Image`, `Fold` | nothing: layout |

  Dropped as well: a field with `is_virtual`, `naming_series`, and in a submittable doctype `status` (worked out from
  docstatus, amounts and dates; its options are written as a comment beside the machine) and `amended_from` (amend is
  left out). A field is required when it has `reqd`, a `default`, or is a `Check`; any other is
  `Blueprint.optional(...)`, an optional link keeping its edge. Each is `Blueprint.described` with its `label` (else
  its `fieldname`), followed by ` (ERPNext's default: <default>)` when the JSON gives one.
- **A link value**, `blueprint/values/<target>-link.ts`, exporting `<Target>Link`, is written when it is missing and
  kept when it is there (a second doctype linking to the same target shares it). Scaffolding the target later changes
  no file already written: turning a `<Target>Link` field into the target's id is a hand edit, a migration of names
  to ids.
- **The machine.** A submittable doctype (`is_submittable: 1`) gets ERPNext's docstatus: states `draft`, `submitted`,
  `cancelled`; moves `create` (from none to `draft`), `save` (`draft` to `draft`), `submit` (`draft` to `submitted`),
  `cancel` (`submitted` to `cancelled`). Any other gets `active`, with `create` (from none) and `save` (`active` to
  `active`). Each move emits `<Thing><Created|Saved|Submitted|Cancelled>`, an event of the thing's id under its camel
  name (`{ teaInvoice: TeaInvoice.fields.id }`). `notFrom: { exit: 40 }`.
- **The operations**, one per move, each answering `{ <thing>: <Thing>.fields.id }`:
  - `create`'s payload is every field with `reqd` that is not `read_only`, in order, then each table as a list,
    keyed by the `Table` field's camel name and described with its label, of rows of the line's fields with `reqd`
    that are not `read_only` (`Blueprint.list` of a `Schema.Struct`). `save`'s is the thing's id, then the same.
  - `submit`'s and `cancel`'s is the thing's id.
  - Each has one database step, `record`. `create`'s and `save`'s write the thing and its lines
    (`writes: [<Thing>, <Line>...]`); the others write the thing alone.
- **The read**, `get`, by id, answering `state` and every field the thing keeps, in order.
- **Who may act is blank.** An ERPNext role is a grant across a company; an Orthograph role is a rule on one instance,
  and the faithful form is a role on Company, `.of("company")` (the spike's found 6). So no role is written, and every
  operation and the read is `allowed: Blueprint.todo<never>("who may <verb> <a|an> <name in lower case>: ERPNext gives
  <right> to "<Role>", "<Role>" and "<Role>")`, on one line, naming in the JSON's order each role whose permission
  row holds that right (`create`, `write` for save, `submit`, `cancel`, `read` for get), "All" among them as ERPNext
  writes it; with none, `ERPNext gives <right> to no role`. These are the only blanks: `ortho check` names one per
  operation and read, and once they are filled, `ortho check` passes.

**For each child table** (`istable: 1`): `blueprint/things/<line>/thing.ts` only, the line, described
`One row of <a|an> <Parent>'s <the Table field's label>.` Its fields are `parent` (the parent's `fields.id`, described
`The <Parent> this row belongs to.`), `idx` (`Blueprint.uint(32)`, described `Its place in the table, from 1.`), then
its own fields mapped as above. A line has no machine, no operation and no read: it is written with its
parent. A line already in the project (a table shared by two parents) is refused, naming it: one parent per line, and
sharing is a modelling call.

## What it refuses

Each refusal exits 2, prints its reason, and writes nothing.

- **A field type it doesn't know**, in the doctype or any of its tables: every such field, each as
  `<Doctype>.<fieldname> (<fieldtype>)`. `Signature`, `Geolocation`, `Table MultiSelect`, `Duration`, `Rating`,
  `Color`, `Password`, `JSON`, `Markdown Editor` and the rest are refused until a decision maps them.
- **A record type wider than the host allows.** A thing is a table, and D1 allows 100 columns: the fields it keeps,
  plus `state` for a doctype (each has a machine) and `version`; a line's are its fields, with `parent` and `idx`, plus
  `version`. Over 100 is refused, naming the doctype, its count and the limit (`Tea Rack Slot needs 101 columns; the
  host allows 100`). Layout fields and dropped fields don't count. This holds until wide things (#879) change how the
  host keeps a thing; then this refusal and its check change with it.
- **A child table whose file isn't there**: the table's field and the paths it looked in.
- **`Currency` fields with no `--asset`**, naming them; and an `--asset` with no `blueprint/assets/<name>.ts`.
- **A thing or a line already there**, naming it.

## What is left out

ERPNext's logic (the controllers' Python) is translated by hand. Amend, a ledger row's `is_cancelled` machine
(GL Entry's `posted → cancelled`), ERPNext's defaults as data a handler starts from (the spike's `*.start.ts`), a
doctype's `status` as states, and `--roles open` are not part of this command; each is a later decision when a
record type needs it.
