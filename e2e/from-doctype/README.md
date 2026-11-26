# The from-doctype checks

Written before `ortho add thing --from-doctype` is built, by an author who builds none of it (`AGENTS.md`, "Journeys
and checks come first"). They check `design/decisions/CX-from-doctype.md`, which fixes the command's shape, and land
board item #877 (`erpnext-scaffolder`). Every check is red today because the flag doesn't exist
(`Unrecognized flag: --from-doctype in command ortho add thing`).

| Check | What it proves | Fixture |
|---|---|---|
| `01-a-plain-record-type` | every field type the command knows maps to its value, in order, required only with `reqd`, a default or a Check; layout, virtual and `naming_series` dropped; the `active` machine with create and save; one blank per operation and read, who may act, naming the ERPNext roles with that right; once filled, the payloads, answers, moves and steps, and `ortho check` passes | `tea_blend` |
| `02-a-child-table` | a table found in ERPNext's own layout becomes a line with `parent` and `idx`, no machine and no operation; the parent's create and save take its rows and write both | `erpnext-layout/tea_menu`, `tea_menu_entry` |
| `03-a-submittable-record-type` | ERPNext's docstatus machine, draft, submitted, cancelled, with create, save, submit and cancel; `status` and `amended_from` dropped; who may act per move, "All" included | `tea_invoice` |
| `04-links` | a link to a thing in the project is an edge (kept when optional), to one not scaffolded the target's name in a shared `<Target>Link` value, to itself its own id, a Dynamic Link any record; scaffolding the target later changes no file already written | `tea_order`, `tea_supplier` |
| `05-refusals` | exit 2, the reason named, nothing written: an unknown field type (in the doctype or its table), a table with no file, Currency with no `--asset` or a missing asset, a name beside the flag, a line already there | `tea_tasting`, `tea_crate`, `tea_blend`, `tea_menu` |
| `06-the-column-limit` | 100 columns fit (97 fields of a doctype, 96 of a line) and the migration holds exactly them; 101 is refused, naming the record type, the count and the limit | `tea_ledger`, `tea_ledger_wide`, `tea_shelf`, `tea_rack` |
| `07-determinism` | two projects get the same bytes from the same files; `--dry-run` prints exactly what a run writes and writes nothing; a second run is refused and changes nothing | all of 01 to 04 |

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
  optional fails. The files a run writes are compared as a set, so an extra file fails. A refusal must also leave
  every file under `blueprint/` and `src/` as it was.

## Running them

```bash
pnpm nx run e2e:from-doctype-ratchet
```

runs the ratchet's own unit test, then every check, then compares the failures with `expected-failing/` (one file per
check; `../ratchet/README.md` says how the list works). `pnpm nx run e2e:from-doctype` runs the checks alone. CI's
`e2e-from-doctype` job runs the ratchet, on the fast gate too for a pull request into `goal/capxul`.

When the build lands and a check passes, the ratchet prints `newly passing, take it off the list`: delete those lines
in the same pull request. `tools/ci/builder-paths.sh` lets a builder shrink the list and refuses an added line or file.
