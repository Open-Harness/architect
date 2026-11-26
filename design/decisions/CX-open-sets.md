# CX-open-sets: a value set that the features depending on its owner add members to

**Decided 26 November 2026** by Goal 16's checks author for gap 2 of `CX-composable-pieces.md` (#1132; that record is on
`goal/capxul`, landing with #1123, and isn't on `main` yet: every citation of it here means that branch), within the
building agent's call on architecture (`AGENTS.md`, "Who decides"). The checks that judge it come in the same pull
request. Capxul's own change to its ledger comes later, in the app's slice, once the build lands.

## Why

Capxul's books are split into features (`CX-composable-pieces.md`, section 1), and the `ledger` feature must not name the
features that post to it. Today `examples/capxul/blueprint/values/ledger.ts` lists `VoucherType` as `["Journal Entry"]`.
#1116 adds Payment Entry, and each new voucher would make the ledger name a later feature. Party type (Customer,
Supplier, Employee, Shareholder) has the same problem. `Blueprint.refAny()` already holds a reference to one of several
kinds, but its kinds are the app's declarations, and nothing lets a later feature add one.

## The calls

1. **An open set is a value.** `Blueprint.oneOf.open(["Journal Entry"])` declares a set whose members are its owner's
   own (here one; `Blueprint.oneOf.open([])` has none) and whatever the features that depend on it add. Like any value it
   is named by its export from a `values/<file>.ts` (`export const VoucherType = Blueprint.value(Blueprint.oneOf.open([…]))`),
   and a field, a payload, an event or an answer holds it as it holds any value. The feature (or app) whose blueprint
   declares it is its **owner**. In code it is a `string`. `Blueprint.oneOf(…)` stays closed and is unchanged.
   **What identifies a set is its owner and its export name** (decided 26 November 2026, on review of #1175): the owner's
   package (`@fixture/ledger`), or the app, and the name it is exported as (`VoucherType`). The name alone does not, and
   neither does the file's path under `blueprint/` with the name: two features may each export a `PartyType` from a
   `values/ledger.ts`, and they are two sets, each with its own members and its own adders, in the model and at every door.
   An addition is to the value it imports, so it reaches one set only. Within one owner, a value's export name is
   already unique, so the pair names one set. The app may own an open set too (`blueprint/values/<file>.ts`); then only
   the app adds to it, since no feature depends on the app.
2. **A feature adds members with `Blueprint.oneOf.add(set, members)`**, exported from one of its own `values/<file>.ts`
   files: `export const paymentEntry = Blueprint.oneOf.add(VoucherType, ["Payment Entry"])`. A member is a plain name,
   as ERPNext names a DocType. **The whole rule:** a feature may add to a set exactly when it is the set's owner or
   depends on the owner, that is, the owner is reached by following `needs` from the adder, through any depth (payroll
   adds Salary Slip through payments). Nothing else in the needs graph counts. Having needs is not enough (leads needs
   only the crm, so it may add to the crm's sets and never to the ledger's). The owner needing the adder doesn't count
   (projects needs the crm; the crm may not add to projects' set). Siblings don't count (expenses and payments both need
   the ledger; expenses may not add to payments' set). An owner may add to its own set from any of its `values/` files.
   A need that is conditional (`need(ledger, { when })`) counts only when the mount picks it, as everywhere
   else a need is met. The app may add to any open set of a feature it mounts, since it depends on all of them, and to
   an open set it owns itself, from any of its `values/` files; the app's additions are judged by the same rules as a
   feature's (call 6).
3. **The compiled model holds the union.** Every field that holds the set has
   `{ type: "schema", format: "choice", options: [...], open: true }`, where `options` is the owner's members in the
   owner's order, then each member a **mounted** feature (or the app) adds, sorted by plain string order (JavaScript's
   default sort, by UTF-16 code unit, never by locale). So renaming a mount moves nothing. **A field holds the set
   wherever the set sits inside it, at any depth** (the features lead, on the 🔍's finding, 26 November 2026):
   - In a list (`Blueprint.list(VoucherType)`, or a list of a reference to one), the list's model is
     `{ type: "schema", format: "list", item: <the set's or reference's model> }`, and it takes only a list (MCP:
     `type: "array"` with the members as `items.enum`, and nothing else beside them).
   - In a struct (`Blueprint.value(Schema.Struct({ kind: VoucherType.schema, note: Schema.String }))`), the struct's
     model is `{ type: "schema", struct: { kind: <the set's model> } }`. It names only the fields that hold a set (or a
     reference to one, or a struct that does), each with its model, so a struct inside a struct nests the same way. A
     list of such structs is `{ type: "schema", format: "list", fields: [...], item: <the struct's model> }`. The
     compiler finds the set by its schema: the struct's field is the set's own `schema`.
   - A list or a struct that holds no set keeps the model it has today (`{ type: "schema", format: "list" }`,
     `{ type: "schema" }`), so nothing generated today changes.

   An installed feature that isn't mounted is never read: what it would add is absent from the model and from everything generated from it, and a
   wrong addition in it refuses nothing. Because the members are in every field's model, an operation's and a thing's
   hash move when a feature that adds is mounted or dropped.
4. **A reference holds a kind from a set and an id.** `Blueprint.refAny.of(VoucherType)` is the value
   `{ kind, id }`: `kind` is a member of the set's union, `id` the referenced record's id (text, never empty). Its model
   is `{ type: "schema", format: "ref-any", options: [...] }`, with the same union as the set. `Blueprint.refAny()` keeps
   its `{ declaration, id }` shape and model, with no options. A reference to one set never takes a member of another.
5. **Every door judges a kind by the model's union, never by the declaration's own list.** The API refuses a member of
   an unmounted feature, a name in no set, a member of another set (another owner's set of the same name included), a
   reference of `refAny()`'s shape, and a reference with an empty id, as a plain value or as a reference's kind, with
   `400 InvalidPayload` before any handler runs. MCP's tool input lists exactly the
   union for each such field (as a JSON Schema `enum` at the field itself, a reference's at its `kind`, a list's at its
   `items`, a struct's at the property that holds the set, in the model's order); every door judges a member inside a
   struct or a list of structs the same way and refuses the same calls. The generated SDK encodes a payload with the same schema
   before it sends, so it refuses the same members with `InvalidPayload` and sends nothing. The generated CLI's help names, for
   each such flag, every member it takes and no other, and the CLI's call with anything else fails. How the doors learn
   the union (a generated table from the model, handed to the runtime) is the builder's.
6. **What the compiler refuses**, each naming the file that declared it: an addition to a value that isn't open (naming
   the value and `Blueprint.oneOf.open`), by a feature or by the app; an addition by a feature that doesn't depend on the
   set's owner (naming the owner's package, or the app's file that declares the set, and the member), including any feature
   adding to a set the app owns; a member two adders add, two features or the app and a feature (naming both files and
   the member); a member the owner already has (naming the owner's file and that member only); a member repeated in one
   adder's additions, within one `add` or across two; and an empty member. Each holds for the app's additions as for a
   feature's. Also refused: the app adding to an open set of an installed feature it doesn't mount (naming the app's
   file and that feature's package), and an owner's own set with an empty member or a member twice
   (`open([""])`, `open(["A", "A"])`), naming the owner's file and the set.

## Interim

Until the build lands, Capxul's ledger keeps a closed list of plain names with no import (`CX-composable-pieces.md`,
section 5, gap 2), so the Books lane doesn't wait on this. Once it lands, Capxul's app slice opens `VoucherType` and
`PartyType`, moves each member to the feature that owns its voucher or party, and may replace the pair `voucherType` and
`voucherId` with one `Blueprint.refAny.of(VoucherType)` where it lists by neither.

## Open, not yet checked

Found by the hostile pass on #1175: a set re-exported from a second package's `values/`. The owner stays the package
that declared it, and a re-export adds nothing; no fixture re-exports a set yet.

## Checks

- `packages/compiler/src/modules/mounts/open-sets.test.ts` (12) and `open-sets-refused.test.ts` (16), with the scratch
  books in `mounts/testing.ts`: the model (calls 1 to 4) and the refusals (call 6), over an in-memory source with
  thirteen installed feature packages and an app that owns a `Channel` set. Among them: a crm with its own `PartyType`
  and an empty `Segment`, leads (needs only the crm), payments owning `PaymentMethod`, projects (owns `ProjectKind`,
  needs the crm), reports (three hops from the ledger), bookkeeping (needs the ledger only when picked to post) and
  audit (needs bookkeeping). One case judges the whole rule of call 2: every mounted feature, and the app, adds to every
  set (the app's own `Channel` included), one pair at a time, and each addition stands or is refused, once, as the needs
  graph that the compiled model reports says.
- `e2e/m2/14-open-sets.test.ts`: the doors (call 5), in a copy of acme with five installed feature packages, four of
  them mounted (the crm's `PartyType` beside the ledger's), and the app's own `Channel` and `Tag` sets, made with the
  real `ortho generate` and run in a world over local D1, plus the generated SDK on its own. It also sends a list of a
  set, a struct holding one and a list of such structs, a reference whose id is a number, a member in another case or padded, and any value of `Tag` (no member), and
  MCP's `enum` must sit where it constrains the field, in the model's order, with nothing beside it that loosens it.

## Supersedes

Nothing. Gap 2's draft in `CX-composable-pieces.md` (section 5, on `goal/capxul`) stands; this record says how it is spelt
(`Blueprint.oneOf.add`, `Blueprint.refAny.of`) and what each door does.
