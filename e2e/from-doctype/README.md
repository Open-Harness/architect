# The from-doctype checks

Written before `ortho add thing --from-doctype` is built, by an author who builds none of it (`AGENTS.md`, "Journeys
and checks come first"). They check `design/decisions/CX-from-doctype.md`, which fixes the command's shape, and land
board item #877 (`erpnext-scaffolder`). Every check is red today because the flag doesn't exist
(`Unrecognized flag: --from-doctype in command ortho add thing`).

| Check | What it proves | Fixture |
|---|---|---|
| `01-a-plain-record-type` | every field type the command knows maps to its value, in order, required only with `reqd`, a default or a Check; layout, virtual and `naming_series` dropped; the `active` machine with create and save; one blank per operation and read, who may act, naming the ERPNext roles with that right; once filled, the payloads, answers, moves and steps, and `ortho check` passes | `tea_blend` |
| `02-a-child-table` | a table found in ERPNext's own layout becomes a line with `parent` and `idx`, no machine and no operation; the parent's create and save take its rows and write both | `erpnext-layout/tea_menu`, `tea_menu_entry` |
| `03-a-submittable-record-type` | ERPNext's docstatus machine, draft, submitted, cancelled, with create, save, submit and cancel; `status` and `amended_from` dropped; who may act per move, "All" included, rows above level 0 ignored and a role in two rows named once | `tea_invoice` |
| `04-links` | a link to a thing in the project is an edge (kept when optional), to one not scaffolded the target's name in a shared `<Target>Link` value, to itself its own id, a Dynamic Link any record; scaffolding the target later changes no file already written, and names each field that still holds the target's name | `tea_order`, `tea_supplier` |
| `05-refusals` | exit 2, the reason named, nothing written: an unknown field type (in the doctype or its table), a table with no file, Currency with no `--asset` or a missing asset, a name beside the flag, a line already there | `tea_tasting`, `tea_crate`, `tea_blend`, `tea_menu` |
| `06-the-column-limit` | 100 columns fit (97 fields of a doctype, 96 of a line) and the migration holds exactly them; 101 is refused, naming the record type, the count and the limit | `tea_ledger`, `tea_ledger_wide`, `tea_shelf`, `tea_rack` |
| `07-determinism` | two projects get the same bytes from the same files, the second run with every clock 400 days on (`later-clock.mjs`); `--dry-run` prints exactly what a run writes, link values and lines included, and writes nothing; a second run is refused and changes nothing | 01 to 04, `infusion` |
| `08-more-shapes` | a one-word name starting with a vowel whose code is taken (`INF`, "an infusion"); Data with Phone and URL options as text; a default making a field required; a reqd read-only field kept but not in the payload; two tables, one not reqd, both in the payload and the writes, in order; a line linking to a record type not scaffolded; a right no role holds | `infusion`, `infusion_step`, `infusion_tag` |
| `09-collisions` | an id prefix held by a thing from an earlier run is lengthened (`tblx` after `tbl`: the compiler wouldn't catch two things sharing one); a refusal code taken by another thing of the same run is lengthened (`TTE` beside `TT`); with every code up to four letters taken, the run is refused | `tea_blend_lot`, `tea_tray`, `tea_teapot`, `codes-taken` |

## How they are built

- **The project.** Each check copies `examples/starter` and lays `e2e/fixtures/from-doctype/project` over it (one
  asset, `usdc`). It runs `ortho` as a user does (`../layer1/support.ts`), never the spike's `scaffold.mjs`.
- **The fixtures** are small doctypes in ERPNext's JSON shape, invented for these checks (a tea shop). Nothing is
  copied from ERPNext, whose files are GPL v3.
- **The model, not the text.** A check reads what the command wrote through `ortho model --json`: each field's value,
  whether it is optional, its edge, its description; the machine; the blanks. Once the who-may-act blanks are filled
  (`fill`, as a person would, with `[Blueprint.signedIn]`), the operations are read whole. Expected values are written
  in the checks from the fixtures and the decision, never read back from the output.
- **Exactly.** Each thing's fields are compared whole and in order, so a field added, left out, widened or made
  optional fails. Each thing's code and each who-may-act blank are compared word for word. The files a run writes are
  compared as a set across the whole project (`node_modules` and `generated/` aside), so an extra file anywhere fails,
  and a refusal must leave the whole project as it was.
- **Values decoded.** Where the model shows only a schema (a `Time` value, a table's rows, a link value), the check
  decodes wire values through the scaffolded schema in a process of its own (`accepts`), good ones and bad.

## Running them

```bash
pnpm nx run e2e:from-doctype-ratchet
```

runs the ratchet's own unit test, then every check, then compares the failures with `expected-failing/` (one file per
check; `../ratchet/README.md` says how the list works). `pnpm nx run e2e:from-doctype` runs the checks alone. CI's
`e2e-from-doctype` job runs the ratchet for a pull request into `goal/capxul` or `main` that can change what the checks
judge (`tools/ci/from-doctype-paths.sh`), and otherwise passes without its steps.

When the build lands and a check passes, the ratchet prints `newly passing, take it off the list`: delete those lines
in the same pull request. `tools/ci/builder-paths.sh` lets a builder shrink the list and refuses an added line or file.
