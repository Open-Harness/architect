# The front end, and how "it replaces everything that works" is proved

Added 26 November 2026, after Aaron's line: "it needs more than that. it needs a front end, it needs to replace
everything that works currently in the vibe coded version."

So the rebuild is not a back end with an interface to follow. It is done when a person can do, in the rebuilt app,
everything that works in Coworker today, on screens. `inventory.md` is the list of what that is.

## What Orthograph has for a front end today

Read from the code and the suites, on this branch.

| Piece | Standing | Where |
|---|---|---|
| A generated SDK per operation, typed, with refusals | runs today | `generated/sdk/`; proved through the SDK by `e2e/m1/20-plugged-in-loop.test.ts` |
| **A generated action per operation**: who calls, the payload check, a refusal that writes nothing, approval asked once | **on `main`** and green by its ratchet | `generated/actions/<thing>/<verb>.ts`; `e2e/ui-layer` checks 01 to 03 and 09 to 13. The status page still says "spiked" for `actions` and `gap-approval-declaration`; it lags |
| `needsApproval` on an operation | on `main` | `examples/plugged-in/blueprint/things/handle/verbs/release.ts` |
| A generated piece per operation (the form or the button, on UI SDK) | red | `e2e/ui-layer/expected-failing/` 04 to 08; no generator, no `generated/web/` |
| `@orthograph/web`, the browser runtime | missing | `packages/web` does not exist |
| Pages, routes and a shell from a declared map | being built | `packages/shell`; Goal 6, parked |
| An example with its own screens | **none** | `plugged-in-screens`, provisional: "no `src/web/` yet" |
| A table, a data grid, a kanban board in UI SDK | missing | K24: "Missing: a data grid or table, and a kanban board" |
| Lists with filter, sort and paging | decided | row `lists`, Capxul's books |
| Live reads | missing | no row |

Goals 5 (the UI layer) and 6 (the portal) own those paths and are both parked, so an app goal that needs a piece of
them takes it, told to Goal 18.

## Three ways, on one rubric

**A. Keep his screens and components; replace only the data layer.** The Astryx screens move as they are. Their seven
server interfaces are written again over the generated SDK.

**B. Rebuild the screens on the generated UI layer as it lands.** Every form and button is a generated UI SDK piece;
pages come from the declared map; Astryx goes.

**C. A staged mix.** His screens and components stay, as in A. Every button and form that changes something calls a
**generated action**, which exists today, in place of a hand-written call. A screen is rebuilt on generated pieces
only when it is one `docs/screens.md` marks New or Redo, and only once the generator exists.

| Test | A. Keep, new data layer | B. Rebuild on the generated layer | C. Staged mix |
|---|---|---|---|
| How soon does it replace what works? | **A** as fast as the back end lands | **F** blocked on a generator, a browser runtime, pages, a table and a kanban that do not exist | **A** the same as A |
| Does it keep the interface he says is how he wants it? | **A** | **D** every screen is redrawn | **A** |
| Does it use what Orthograph generates? | **D** the SDK only; refusals and approvals written by hand in seven adapters | **A** all of it | **B** the SDK and the actions today; pieces later |
| "Waiting for an Owner", and a refusal under the field | **C** by hand, as today | **A** generated | **A** from the generated action: approval asked once, a typed refusal that writes nothing |
| Can an agent drive the page? | **D** no | **A** UI SDK's agent bridge | **C** not the page; but every action is also an agent's tool |
| Work thrown away later | **C** the seven adapters | **A** none | **B** less than A: an action call is where a piece later sits |
| What it needs from the framework | an example with a web project; lists; reads fast enough to poll | the generator (checks 04 to 08), `packages/web`, pages and shell, a table and a board on UI SDK | A's needs, and the actions projection, which is there |
| Whose paths | Coworker's own; `lists` is Capxul's by rank | Goal 5 and Goal 6, both parked: Coworker would be un-parking two goals | Coworker's own; nothing parked has to move |
| Fits K24 ("go in all the way" on UI SDK) | **D** | **A** | **C** it says where UI SDK comes in, and when |
| Risk | the old interfaces leak the old model into the new one | the product has no screens for months | two component libraries for a while |

**Recommended: C.** It replaces what works at the speed of the back end, keeps the interface, and puts every write
through something the framework generates and checks. B is where it ends up, one screen at a time, and no screen
waits on it.

What C changes in his code: the screens keep their components and their props. The seven `createXApi(server)`
adapters are thrown away and written again: reads call the generated SDK, writes call generated actions. The shell's
import of the old server's `access` rules is replaced by what the SDK says this caller may do. Nothing else moves.

One thing to settle before the first screen: the adapters must not carry the old model's shapes into the new one. A
screen that `docs/screens.md` marks Keep or Adapt is ported. A screen it marks Redo is drawn again first, because its
shape is the old model's (the task page as a form, the board without a way to add a task).

## The folder, with the front end in it

```text
examples/coworker/                 one folder, two workspace projects
  project.json                     the app: tag scope:project
  blueprint/
    values/  things/<thing>/{thing,machine,events,errors,roles}.ts  things/<thing>/verbs/<verb>.ts
    agents/                        manager.ts, worker.ts
    features/                      agents, teams, intake, tickets: the mounts
    adapters/                      github, email
    projections/                   model, api, server, sdk, cli, mcp, actions, infra
    environments/  starting-worlds/
  journeys/                        the loop, an ask, mail in, an issue in …
  src/
    <thing>/<verb>.ts              handlers: Effect, the repository's rules apply
  plugins/                         written here first: email, vault
  generated/                       never edited
    model/ api/ server/ sdk/ cli/ mcp/ docs/ actions/ infra/
    web/                           empty until the pieces generator exists
  web/                             the front end: its own project
    project.json                   tag scope:app-web (new): may import generated/sdk, generated/actions, react, Astryx
    src/routes/                    his routes, kept, so his browser tests find the same pages
    src/modules/team-*/  ui/       his screens and components, moved as they are
    src/modules/*/internal/api.ts  the seven adapters, written again
e2e/coworker/                      the journeys' gate, with expected-failing/
e2e/coworker-parity/               his browser tests, ported, with expected-failing/
```

**Two projects, one folder.** The handlers are Effect code that runs in a Worker under this repository's rules (no
`async`, no wall clock). The screens are React with a router and a bundler, `async` throughout. One project would
put both under one set of lint rules and one set of allowed imports. K29 draws an app's screens at `src/web/` inside
the app; that was drawn for Plugged In's three screens, and Coworker has about 45 and 15,500 lines. So it needs a
new tag for an app's web project, which is a small change to `.oxlintrc.json` and the first framework change the
front end asks for. **Not checked in full:** which of the lint overrides already exempt an example's `.tsx` files.

**It does not change "one repository or its own".** Both projects move out together, later. If anything it
strengthens staying: the front end's adapters are written against `generated/sdk` and `generated/actions`, which are
regenerated in the same pull request as a blueprint change.

## Parity as the done check

The starting idea was: the current app's own end-to-end stories become the acceptance suite, kept as a list of what
is still red that may only shrink. **It holds, with three changes.**

1. **The browser tests alone are too weak to be the whole check.** Aaron's own finding F23: 81 of 81 passed while the
   product was unusable. The board's test "only looks for three task titles in each view" (F25). So parity is three
   lists, not one suite:
   - **Works, must match.** Each row of `inventory.md` marked works, with the check that proves it in the rebuild.
   - **Broken, must not be copied.** Each finding in Coworker's `docs/findings.md`. A rebuilt screen that reproduces
     a finding is not parity, it is the same bug. Each gets a check that fails on the old behaviour.
   - **Agents, built right.** Outside parity. Their checks are the journeys in `agents.md`.
2. **Two suites, by where the truth is.**
   - `e2e/coworker/`: the 36 flow files as **journeys** proved by `ortho prove`. This is where behaviour is proved:
     mail becomes a task, a stranger gets nothing, a Member cannot open settings.
   - `e2e/coworker-parity/`: the 20 browser specs, ported. They press by role and by words, and the routes are kept,
     so most should run against the re-pointed screens nearly unchanged. They prove a person can get there on a
     screen.
3. **The ratchet is this repository's own**, not Coworker's score file: one file per check in
   `expected-failing/`, and a builder may only delete one (`AGENTS.md`, "Journeys and checks come first"). The port
   is done by an author, not by the builder, and every ported check is shown to fail before the builder starts.

And one addition, because Aaron listens and looks rather than reads: Coworker's suite already takes a screenshot of
every screen (`e2e/shots.ts`). Keep it, and put the old and the new side by side on one page for him at the end of
every front-end slice.

**Done** is then one sentence: both `expected-failing/` folders are empty, every finding has a check that passes,
and the side-by-side page has nothing he has not seen.

What parity does not cover, and should be said plainly: the live tier (real mail, a real GitHub App, real
containers) needs staging with credentials, which is Aaron's to grant; and speed (his findings F15 to F20) needs a
measure of its own, which Orthograph's traces can give and Coworker never had.
