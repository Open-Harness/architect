# Spike: erpnext-doctypes

Goal 16, slice 4 (#710). Branch `spike/erpnext-doctypes`. Run 23 November 2026 in Amp, on claude-opus-5-5.

**Question.** Can Orthograph things, machines and journeys be scaffolded from ERPNext's record-type (doctype) files,
starting with Sales Invoice, Payment Entry and GL Entry?

**Answer.** Yes for the record shapes, with gaps to close first; no for the logic. A 288-line script turns the three
doctypes and their seven child tables into 10 things with machines, events, roles, operations and reads. The blueprint
passes `ortho check`, `ortho generate` writes the app, and `ortho add journeys` writes 49 journey stubs. Payment Entry
and GL Entry then run on the local runtime: two journeys pass, covering create, submit (two ledger lines posted),
a refused second submit, and cancel. Getting that far took four framework gaps, worked around in the spike (found 4):
nullable columns, values that only round-trip as text, nullable structs, and Sales Invoice's 130 fields against D1's
100-column limit. ERPNext's logic (about 15,000 lines of Python behind these three doctypes) can't be scaffolded from
the JSON and stays a translation by hand.

## How to run it

```bash
spikes/erpnext-doctypes/run.sh      # fetch, scaffold, overlay proof/, generate, check, prove; about 35 s
```

- `fetch.sh` downloads ten doctype JSON files from `frappe/erpnext` at commit `a6f54f9c` (`version-15`, read 23
  November 2026) into `fixtures/`. They are outside data under GPL v3: read, never run, and not committed.
- `scaffold.mjs <fixtures> <out> [--roles todo|open] <Doctype>...` writes a blueprint project into `out/`, which git
  ignores, plus `report.json` (what was kept, dropped and lost). `--roles todo`, the default, leaves who may act as
  `Blueprint.todo`. `--roles open` lets anyone signed in act, so the result runs.
- `proof/` is the hand-written part laid over `out/pe`: the Payment Entry handlers, a submit that answers its two
  ledger lines, a GL Entry read, and two journeys.

## What was tried

1. **The mapping** (`scaffold.mjs`). A doctype becomes `blueprint/things/<kebab>/`. Each field type maps to one value:
   - Data and the text types become `Blueprint.text`; an Email field becomes `Blueprint.email()`.
   - Select becomes `Schema.Literals` of its options.
   - Currency becomes `Money`, a signed bigint in smallest units: a return invoice is negative.
   - Float and Percent become exact `Decimal` text. Int becomes `Count`, Check becomes `Flag`.
   - Date becomes `Day`, Time becomes `TimeOfDay`, Datetime becomes `Blueprint.instant()`.
   - A Link becomes the target's `fields.id` when the target is scaffolded, and otherwise a branded id value in
     `values/links.ts` (51 targets for the first three doctypes, such as `CompanyRef` and `AccountRef`).
   - A Dynamic Link becomes `Blueprint.refAny()`, and its DocType field is dropped.
   - A child table becomes a thing of its own, with `parent` and `idx`.

   Layout fields (breaks, HTML, buttons) are skipped. A field that isn't required and has no default is nullable. A
   field's label becomes its description. The first pass of each mapping was checked by running `ortho check`.
2. **Machines.** A submittable doctype gets ERPNext's docstatus: `draft → submitted → cancelled`, with create, save,
   submit and cancel. A doctype with `is_cancelled` (GL Entry) gets `posted → cancelled`.
3. **Who may act.** `permissions` becomes one role per ERPNext role. A move takes the roles with that right, and
   ERPNext's "All" becomes `Blueprint.signedIn`. A move no role may make becomes `Blueprint.system`, as GL Entry's
   create and cancel are.
4. **One rule from the controllers, not the JSON:** when GL Entry is scaffolded, a voucher's submit and cancel write it
   in the same step (`writes: [SalesInvoice, GlEntry]`).
5. **Trying to break it:** three more doctypes with their child tables (Purchase Invoice, Journal Entry, and HRMS's
   Salary Slip at `frappe/hrms@46b38904`), 18 things in all. Two runs were diffed for sameness. The app was run with
   `ortho dev` and `ortho prove`, and a bug was planted in a handler.

## What was found

1. **The shapes scaffold.** Run on the three doctypes, the scaffolder writes 10 things and 44 files in 0.05 s. Of 210
   Sales Invoice fields it keeps 130 (93 of them nullable), skips 68 layout fields and drops 12. With `--roles open`,
   `ortho generate` (2 s) and `ortho check` give `types ✔ rules ✔ drift ✔ check ✔`. Run on six doctypes, it writes 18
   things, and `ortho generate` writes 191 files that also pass `check ✔` (4.2 s). Two runs are byte for byte the same.
2. **Journeys scaffold too.** `ortho add journeys` on the three things writes 49 stubs: each machine path, allowed and
   refused, plus each role. They are red with blanks until a journey author fills them, which is the "scaffoldable"
   stage in K42. A move only `Blueprint.system` may make gets the file name `gl-entry-cancel-refused-not-.ts`, with
   nothing after "not": a small bug in `renderJourneyStubs`.
3. **It runs, once four gaps are worked around.** `ortho prove` on Payment Entry and GL Entry ends
   `journey a payment is cancelled ✔ 4/4` and `journey a payment is received and posted ✔ 4/4`. In the second journey,
   1,180.00 at a rate of 1.25 posts a debit read back as `147500n` against `ac_bank`. The other 4 failures are
   coverage only: operations no journey reaches yet. With the planted bug (the debit sent to the wrong account), the
   journey fails at the right step: `answer "ac_debtors", expected "ac_bank"`.
4. **Four framework gaps stopped the runtime before that**, each seen as a failure, in this order:
   1. **No column may be empty.** `packages/projections/src/modules/server/internal/worker-config.ts:60` writes every
      field as `TEXT NOT NULL`, so a `Schema.NullOr` field fails: `NOT NULL constraint failed: payment-entry.costCenter`.
      `run.sh` patches the generated migration in `out/` as a stand-in.
   2. **Only text round-trips.** Every column is TEXT, so `Schema.Boolean` comes back as `"1"`:
      `SchemaError: Expected boolean at ["customRemarks"]`. `Flag` became `"0" | "1"` (ERPNext's own storage) and
      `Count` became `FiniteFromString`.
   3. **A nullable struct reaches D1 as an object.** `rows.ts` stores a struct as JSON only when it isn't a union, as
      its own comment says: `D1_TYPE_ERROR: Type 'object' not supported`. The six nullable Dynamic Links became
      `Schema.fromJsonString` text.
   4. **A wide thing doesn't fit D1.** `ortho dev` on Sales Invoice gives `too many columns on sales-invoice`: 130
      fields plus id, state and version, against D1's limit of 100 columns. Purchase Invoice has 121. Payment Entry
      (59) fits.
5. **The declaration language lacks some of ERPNext's shapes.** Each was worked around, and each is a gap:
   - **Optional fields.** Things have none, so 93 of Sales Invoice's 130 fields are `Blueprint.value(Schema.NullOr(...))`,
     and every insert spells out each null. The scaffolder writes `src/erpnext/<thing>.start.ts`, the row of
     ERPNext's defaults that a handler spreads its payload over.
   - **Signed money, decimals and dates.** `Blueprint.uint` can't hold a return's negative total. There is no exact
     decimal for rates and quantities, and no calendar day for posting and due dates. All three are written as
     schemas in `values/erpnext.ts`.
   - **Optional and two-way links.** A link that may be empty can't keep its edge: a `Field` can't be wrapped, so it
     becomes the id's schema (2 such links in the six-doctype run). Two things that link to each other (Sales
     Invoice and Purchase Invoice) fail to load (`ReferenceError: Cannot access 'PurchaseInvoice' before
     initialization`), so one edge of each cycle becomes a plain id.
   - **Ids of things not built yet.** A journey can't write `"co_acme"` for a branded `CompanyRef` without `as never`.
6. **Who may act doesn't translate.** An ERPNext role is a grant across the company; an Orthograph role is a rule on
   one instance. The difference showed at runtime: create was refused with `NotAllowed`, because a role on a Payment
   Entry can't admit the call that creates it. The faithful form is a role on Company, `.of("company")`, which needs
   Company as a thing, and that thing is a design question. So in the default mode the scaffolder leaves 9 blanks,
   all about who may act. Two smaller snags showed up there:
   - `Blueprint.todo` as one element of `allowed` crashes the compiler (`allowed.ts:35`, reading `service` of
     undefined) instead of being reported as a blank.
   - `allowed: Blueprint.todo(...)` fails to type-check (TS2322) once the payload is real.
7. **The JSON holds the shape, not the rules.**
   - GL Entry's JSON marks no field required. Its Python (`gl_entry.py`) sets account, voucher and company as
     mandatory, so the scaffolded create takes an empty payload.
   - Sales Invoice's `status` has 13 values worked out from amounts and dates (Paid, Partly Paid, Overdue, and so on).
     They aren't moves, so they are written beside the docstatus machine, not as its states.
   - Amend (a cancelled invoice copied with `amended_from`) is left out.
   - Child tables shared by several parents (taxes, used by quotations, orders and invoices) are scaffolded with one
     parent.
   - The logic behind these doctypes is the bulk of the work, and none of it is in the JSON. In lines at
     `a6f54f9c`: `sales_invoice.py` 3,364, `payment_entry.py` 3,877, `gl_entry.py` 472, `general_ledger.py` 933,
     `taxes_and_totals.py` 1,509, `accounts_controller.py` 5,103. The proof's 65 lines of handlers translate one
     path of it: base amounts at the exchange rate, and a payment's two ledger lines.

## Measurements

| | Three doctypes (10 things) | Six doctypes (18 things) |
|---|---|---|
| Scaffold | 0.05 s, 44 files | 0.08 s, 84 files |
| `ortho generate` | 2.0 s, 110 files | 2.3 s, 191 files |
| `ortho check` | ✔ (`--roles open`); 9 blanks and 2 type errors (default) | ✔ (4.2 s) |
| Links to things not scaffolded | 51 doctypes | 72 doctypes |
| Child tables with no fixture, skipped | 5 | 12 |
| `ortho prove`, Payment Entry and GL Entry | 2 journeys ✔ 8/8 steps, about 30 s | not run (Sales and Purchase Invoice don't fit D1) |

## The decision it supports

Slice 4's question is answered yes for shapes. So a doctype scaffolder should go into the framework, as the brief
says, once these come first: the server projection's columns (nullable, encodings that aren't text, nullable
structs, things wider than 100 columns) and the value types (signed money, decimal, day, an optional reference). The
scaffolder could then become an `ortho add` kind (for example `ortho add thing --from-doctype <file>`). It would write
what `scaffold.mjs` writes and leave who may act blank. Under K42's collision rule, the projection's columns and the
value types are framework pieces Capxul pulls. Their paths (`packages/projections/`, `packages/host-cloudflare/`,
`packages/orthograph/src/modules/values/`) need a claim check before Goal 16 takes them.

For slice 6 and slice 3's grill:

- Company has to be a thing, with roles such as Accounts User, Accounts Manager and Auditor, before any book can say
  who may act.
- K43's open money question: amounts in smallest units mean reading each currency's precision per document (base
  amounts are in the company's currency, the others in the document's).
- Whether Sales Invoice keeps ERPNext's flat 130 fields or is split (header, party, totals) is a modelling choice.
  D1's 100-column limit forces it either way unless the host changes how it stores a thing.

## Open risks

- `run.sh` patches the generated migration, a stand-in for gap 4.1. The proof says nothing about migrations.
- The roles in `--roles open` mean anyone signed in. The proof tests the flow, not who may act.
- The mapping was checked on 18 doctypes from two apps. Others have field types these don't use (Geolocation,
  Signature, Table MultiSelect, Duration), which would show up in `report.unknownTypes`.
- A close translation likely carries ERPNext's GPL v3 (K43, section 5). The scaffolded output and the fixtures are
  kept out of git here; only field names appear in this README.
