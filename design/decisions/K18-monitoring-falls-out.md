# K18: monitoring falls out of the model

Proposed 19 November 2026 by the 📐 portal designer, answering Aaron: "we dont even have alearts, errors, or dashboards
we should research and design the critical path. the thing that we ship and space for designing more". The evidence
is in three places:

- the research in [`../research/monitoring.md`](../research/monitoring.md);
- the drawing: the Issues and Alerts pages in `spikes/portal-site`, published at
  https://claude.ai/artifact/NzDgHFzQSk8yvX8cLNqUKj;
- the model on `m1` (`packages/compiler/src/modules/model/types.ts`).

**Status: decided.** Aaron, 19 November 2026: "K18 all A". Every question below is answered A, as recommended. The
four new slices are rows in `design/milestones.md`: M1.49 (in Gate M1's list and on the critical path, right after
M1.13), M3.23, M5.15 and M7.14.

## For the ear

We ship monitoring the way we ship docs: it falls out of the blueprint.

- **First, one slice right after the portal (M1.49).** It turns what the model already says into alert rules and
  issues, and shows them in the portal. Locally they are shown and never sent.
- **Then, when there is a real cloud (M7).** The same rules are written into the sink, Axiom or Grafana, and the
  environment file says where they go.
- **Later (M3).** You can declare dashboards of your own, typed, pointing at your operations.
- **The one hard question.** How to warn about a thing stuck in a state without counting things, which we agreed the
  portal never does.

## Decision (Aaron, 19 November 2026: "K18 all A")

1. **Rules are data the compiler derives**, never files someone writes. From the model come:
   - a latency objective per budget;
   - a defect objective per operation;
   - an anomaly rule per refusal code;
   - a verdict rule per journey and environment.

   Each rule carries the labels `environment`, its subject, `severity` and `owner`. The portal evaluates them over
   `TraceSource.window`, and a sink exporter writes the same rules into the sink. Both read one list.
2. **The defaults** are in the research: 95% of calls within the budget, and 99.9% without a defect, both over 28 days,
   with the standard burn windows. An operation may override them with `slo`. Burn alerts need at least 20 calls in
   the short window before they fire.
3. **An issue is one (operation, step, error tag).**
   - It has first seen and last seen, keyed by that operation's declaration hash, which gives "regressed".
   - Its owner is the declaring file or plugin.
   - A refusal never opens an issue.
   - A step may name a `groupBy` field to split a generic error tag.
4. **Routes live on the environment file**, next to the sinks, and can only lower a severity. Without a route:
   - local shows alerts and never sends them;
   - staging sends to the portal's "Needs you";
   - production does the same, until a route is named.
5. **A stuck state is a declared limit on the state.** Each thing that overstays raises one signal when its timer
   fires. Nothing counts how many things are in a state, so round 2 Q4 stands (Q3 below).
6. **Custom dashboards are typed code** in `blueprint/dashboards/`. Panels refer to declarations, never to metric
   names. The generated pages stay the default, and a dashboard adds to them.

## What ships first, and what each milestone adds

| When | Slice | Ships |
|---|---|---|
| M1, right after M1.13 | **M1.49** (new) | Rules and issues derived and shown in the portal: Issues, Alerts, the latency objective block on the Metrics tab, and the worst-first list on home. Local only, never sent |
| M1 | M1.36 (existing) | Already carries `refusal.code`, `move.from`, `event.name` and `ortho.budget.breaches`, which M1.49 reads. No change |
| M3 | **M3.23** (new) | `Dashboard.make` and `Panel.*`, under Monitor › Dashboards. A panel that refers to a removed declaration fails the build |
| M5 | M5.14 (existing) | A fired alert lands in the work inbox. M1.49's issues join it with their key, so one issue makes one work item |
| M5 | **M5.15** (new; Q3 is A) | Declared state limits: a timer per thing that enters a limited state, through `Timers`, raising `<thing>.overstayed` |
| M7 | **M7.14** (new) | Rules exported to the sink (Axiom monitors with the burn rate in APL, or Grafana rules through its Foundation SDK). Routes from the environment file. Tested in the staging pass and destroyed after |

### Milestone rows (added to `milestones.md` on 19 November 2026)

| ID | Slice | Needs | Kind | Done when | Size |
|---|---|---|---|---|---|
| M1.49 ∥ | Monitor, derived (K18): the compiler derives the alert rules (latency objective per `budget`, defect objective per operation, anomaly per refusal code, verdict per journey and environment) and adds them to the portal's data with their labels; issues keyed by (operation, step, error tag) with first and last seen by the operation's declaration hash; the portal evaluates both over `TraceSource.window` at a fixed `now`; Issues and Alerts pages and the worst-first list on home, from `@orthograph/portal-ui`; nothing is sent from local | M1.13, M1.20, M1.36 | build | in a local world: 20 calls slowed past `profile.get`'s budget fire its fast burn; one call does not; a planted defect in `link.add`'s `record` step opens one issue and a second joins it; a refusal opens none; the same defect after its operation's declaration changes shows regressed; screenshots are byte-identical at the same `now` | M |
| M3.23 ∥ | Custom dashboards (K18): `Dashboard.make` and `Panel.latency`, `Panel.refusals`, `Panel.rate` and `Panel.calls` in `orthograph`, taking declarations; files in `blueprint/dashboards/` show under Monitor › Dashboards with one time control and the environment as a variable | M1.49, M3.21 | build | Plugged In's `public-page` dashboard renders; deleting the operation one of its panels names fails `ortho check` with the panel's file and line | S |
| M5.15 ∥ | Declared state limits (K18 Q3): `within` on a machine state; entering it starts a `Timers` wait for that thing; leaving cancels it; overstaying raises `<thing>.overstayed` once, which becomes an alert rule with no counting | M5.14, durable timers | build | a fixture link held in `listed` past a 1 min `within` raises one `link.overstayed` and one alert; one that moves on in time raises nothing; the portal shows no count of links in any state | S |
| M7.14 | Monitors to the sink (K18): the same rule list written to each declared sink (Axiom monitors with the burn rate in APL; Grafana alert rules and dashboards through its Foundation SDK); `alerts` routes on the environment file, which can only lower a severity | M1.49, the staging pass | build | in the staging pass the generated monitors exist with their labels; 20 slowed calls fire the builder route; a route that raises a severity fails `ortho check`; every monitor is destroyed afterwards; production routes compile, and nothing pages without Aaron's written yes | M |

### Extension points

- **Dashboards:** `blueprint/dashboards/*.ts` (M3.23).
- **Routes:** `alerts` on the environment file (M7.14).
- **Targets:** `slo` on an operation.
- **Owners:** `owner` on an operation or a mount.
- **Opt-outs:** `alert: false` on an error.
- **Splitting issues:** `groupBy` on a step.
- **Stuck states:** `within` on a state (M5.15).
- **Faces:** a plugin's face (M3.21) can add a Monitor view of its own through the same slots as any face.
- **Sinks:** a new sink is one exporter that reads the rule list.

## Grill for Aaron, round K18

Shared terms, said once:

- **Rule:** one alert condition the compiler derives.
- **Objective (SLO):** a target share of good calls over 28 days.
- **Burn:** how fast the allowed bad calls are being spent.
- **Route:** where a fired rule goes.
- **Issue:** one group of defects.
- **Populations:** how many things are in each state right now. Round 2 Q4 keeps them out of the portal.

## Q1: What ships first, and when?

**The problem, in code.** M1.13 already draws the Metrics tab with p95 against the budget. Nothing turns a breach into
an alert or a defect into an issue. The data exists, but no rule reads it. The budget is declared:

```ts
// examples/acme/blueprint/things/allowance/verbs/spend.ts:17 (origin/m1)
  budget: { p95: "150 millis" },
```

```ts
// packages/compiler/src/modules/model/types.ts:96 (origin/m1)
  readonly budget: { readonly p95Ms: number } | null;
```

Why it matters: if nobody decides, M1.13 ships a portal that shows a breach but never warns anyone. Later someone
hand-builds alerts in Axiom's UI, which is the configuration we promised never to need.

**What it touches**

| Dependent | Why it cares |
|---|---|
| M1.13 (`milestones.md:204`) | Already size L. Adding monitoring to it delays the portal |
| M1.36 | Produces `refusal.code` and `ortho.budget.breaches`, which the rules read |
| M1.15 Gate M1 | Gains one more slice if M1.49 joins M1 |
| M5.14 | Alerts into the work inbox, which needs alerts to exist |

**The options**

**Today**: alerts only exist as the word "alert" in M5.14's row, and nothing derives them.

```bash
git grep -n -i "alert" origin/m1 -- packages/   # only site.test.ts:75, an XSS test string: no rule, no issue
```

**A · New slice M1.49 right after M1.13, local only** (recommended)

```text
M1.13  portal shell, metrics, spans, proof      ──▶  M1.49  rules + issues derived, shown, never sent
M7.14  the same rules exported to Axiom/Grafana, routes from the environment file
```

**B · Fold it into M1.13**

```text
M1.13  portal + metrics + rules + issues + Alerts page     (L → XL)
```

**C · Wait for the cloud (M7)**

```text
M1.13  portal shows breaches, no rules
M7.xx  rules, issues and routes, built straight in the sink's UI or API
```

**You do X → what happens**

| Scenario | A · M1.49 | B · fold into M1.13 | C · wait for M7 |
|---|---|---|---|
| You open the portal in M1 after a slow deploy | The Alerts page says the latency objective is burning | The same, but M1.13 lands later | You see the p95 line over budget and nothing else |
| A defect happens in a journey run | One issue, with its owner | One issue | A red span you have to find |
| Axiom arrives in M7 | It reads the same rule list | The same | Rules are built for Axiom first, and the portal copies them |
| M1.13 slips | Monitoring waits; M1.13 is unchanged | Both slip together | No effect |

**Rubric**

| Axis | A · M1.49 | B · fold into M1.13 | C · wait for M7 |
|---|---|---|---|
| Floor-first | ✅ real rules in M1 | ✅ real rules in M1 | ❌ only a promise until M7 |
| Reversibility | ✅ a slice can be dropped | ⚠️ tangled with the shell | ✅ |
| Blast radius | ✅ new pages and one new data field | ⚠️ grows the largest slice | ⚠️ sink-first shape leaks into the model |
| Correctness | ✅ the rules are tested locally at a fixed `now` | ✅ | ❌ rules tested only against a live sink |
| Fit | ✅ one rule list, read by the portal and the sink | ✅ | ❌ hand-configured, against "falls out" |
| Parallelizability | ✅ runs while M1.13's later parts finish | ❌ | ✅ |

**Recommendation: A.** It ships real alerts and issues in M1 without growing M1.13, and the rule list it creates is
the one M7 exports.

## Q2: Where do the targets come from?

**The problem, in code.** A latency objective needs a target and a window. The budget gives the threshold, not the
share or the window. Nothing gives a defect target.

```ts
// packages/compiler/src/modules/model/types.ts:96 (origin/m1)
  readonly budget: { readonly p95Ms: number } | null;   // a threshold; no share, no window
```

Why it matters: without a default, every operation needs a hand-written objective before it is watched. Most never
get one, and they go unwatched.

**What it touches**

| Dependent | Why it cares |
|---|---|
| Each operation file (`verbs/*.ts`) | Whether it must say more than `budget` |
| The Metrics tab | Shows the objective and the error budget left |
| M7.14 | Writes the same numbers into the sink |

**The options**

**Today**: the budget is the only latency declaration, at `spend.ts:17`: `budget: { p95: "150 millis" }`.

**A · Defaults, with an optional override** (recommended)

```ts
// nothing new by default: 95% within budget.p95, 99.9% without a defect, 28 days
export default Blueprint.operation(Link, {
  budget: { p95: "150 millis" },
  slo: { withinBudget: "99%" },   // optional, only where the default is wrong
});
```

**B · Every operation declares its objective**

```ts
export default Blueprint.operation(Link, {
  budget: { p95: "150 millis" },
  slo: { withinBudget: "95%", withoutDefect: "99.9%", window: "28 days" }, // required, or check fails
});
```

**C · One target per environment**

```ts
// blueprint/environments/production.ts
export default Blueprint.environment({ slo: { withinBudget: "95%", withoutDefect: "99.9%" } /* every operation */ });
```

**You do X → what happens**

| Scenario | A · defaults + override | B · always declared | C · per environment |
|---|---|---|---|
| You add `link.pin` with a budget | Watched at once | `ortho check` fails until you write `slo` | Watched at the environment's target |
| `session.sign-in` must be stricter | One `slo` line on it | Already there | Not possible without a second mechanism |
| You read an operation file | The budget is the target | Three more numbers on every file | The target lives elsewhere |

**Rubric**

| Axis | A · defaults + override | B · always declared | C · per environment |
|---|---|---|---|
| Floor-first | ✅ every operation watched today | ⚠️ watched only after typing | ✅ |
| Reversibility | ✅ the override is optional | ⚠️ removing it is a breaking change | ✅ |
| Blast radius | ✅ one optional field | ❌ every operation file | ⚠️ the environment shape |
| Correctness | ✅ standard SRE defaults | ✅ | ⚠️ one target can't fit every operation |
| Fit | ✅ the budget already means "the target" | ❌ repeats the budget | ⚠️ the environment changes bindings only (K17) |

**Recommendation: A.** The budget is already the declaration, and K17 says environments only change bindings, which
rules out C.

## Q3: How do we warn about a thing stuck in a state?

**The problem, in code.** A machine says where a thing may go, not how long it may wait. The obvious alert, "more
than N links in `listed` for over a day", counts things in a state. We agreed the portal never counts them.

```ts
// examples/acme/blueprint/things/allowance/machine.ts:5-13 (origin/m1)
export const machine = Blueprint.machine(Allowance, {
  states: ["active", "exhausted", "revoked"],
  moves: { grant: { … }, spend: { from: ["active"], to: ["active", "exhausted"], … }, revoke: { … } },
  notFrom: { exit: 40 },
});
```

```markdown
<!-- design/portal.md:159 -->
**No populations** (Q4 A): the page never says how many handles are in each state.
```

Why it matters: a payment stuck in `submitted`, or an invitation never accepted, is exactly what people want warned
about. If we don't decide, someone writes a query over the database, which breaks the portal's rule against reading
stored data.

**What it touches**

| Dependent | Why it cares |
|---|---|
| Round 2 Q4 (`portal.md:159`) | B reverses it |
| The machines page and the drawing's callout | It says this question was asked here |
| `Timers` (AGENTS.md) | A needs a counted wait per thing |
| Wallets (M1.29, ST2.03) | `submitted` → `confirmed` is the first real case |

**The options**

**Today**: nothing. The Machines page in the drawing carries a callout saying so.

**A · A limit on the state, one signal per overstay** (recommended)

```ts
export const machine = Blueprint.machine(Link, {
  states: ["listed", { name: "pending", within: "1 hour" }, "removed"],
  // entering `pending` starts a Timers wait for that link; leaving cancels it;
  // overstaying raises link.overstayed once → an alert rule. Nothing counts links.
});
```

**B · Allow counts of things per state (reverse round 2 Q4)**

```text
rule: count(link where state = "pending" and enteredAt < now - 1h) > 0
      reads stored data from the portal and the sink
```

**C · Nothing until a real case appears**

```text
no field, no rule; revisit when wallets need it
```

**You do X → what happens**

| Scenario | A · state limit | B · counts | C · nothing |
|---|---|---|---|
| A payment sits in `submitted` for 2 hours | One alert for that payment, linked to its trace | An alert saying "1 in submitted > 1h" | Nobody knows |
| You open the Machines page | Arrows lit by moves, no counts | Counts per state | Arrows lit by moves |
| A store holds a million links | No cost: timers exist only for limited states | A count query over a million rows | No cost |
| Privacy | Only the thing's id is on the signal | Stored data reaches the sink | Nothing leaks |

**Rubric**

| Axis | A · state limit | B · counts | C · nothing |
|---|---|---|---|
| Floor-first | ⚠️ needs durable timers (M5) | ✅ a query today | ❌ |
| Reversibility | ✅ an optional field | ❌ reverses an agreed answer | ✅ |
| Blast radius | ⚠️ the machine shape and the runtime | ❌ the portal and the sinks read stored data | ✅ none |
| Correctness | ✅ exact per thing | ⚠️ a snapshot that misses short stays | ❌ |
| Fit | ✅ the model declares it, and telemetry carries it | ❌ breaks Q4 and no-leak | ⚠️ leaves the gap |

**Recommendation: A.** It keeps Q4 and no-leak, it is exact, and it lands as M5.15 once durable timers exist.

## Q4: Where do routes and severity live?

**The problem, in code.** The environment file already names the sinks, but nothing says who hears an alert.

```ts
// examples/acme/blueprint/environments/local.ts:7 (origin/m1)
  telemetry: [Telemetry.sink.local()], // prove's Collector, a process of its own
```

```ts
// packages/compiler/src/modules/model/types.ts:113,131 (origin/m1)
export type SinkModel = { readonly sink: "local" } | { readonly sink: "axiom"; readonly group: string };
  readonly telemetry?: ReadonlyArray<SinkModel>;
```

Why it matters: if this isn't declared, routing gets set up by hand in each sink's UI and drifts between environments.
Or every staging blip pages a person.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `EnvironmentModel` (`types.ts:116`) | Gains a field, or doesn't |
| K17's four axes | The environment changes bindings only. A route is a binding |
| M7.14 | Writes the routes into the sink |
| AGENTS.md "outward-facing" | A production page is outward-facing, so it needs Aaron's yes |

**The options**

**Today**: no route anywhere. Sinks only.

**A · `alerts` on the environment file, lowering only** (recommended)

```ts
// blueprint/environments/production.ts
export default Blueprint.environment({
  telemetry: [Telemetry.sink.axiom({ group: "plugged-in" })],
  alerts: [Alerts.route({ severity: "page", to: Alerts.webhook("ONCALL_URL") }),   // a secret name, never a URL
           Alerts.route({ severity: "ticket", to: Alerts.needsYou })],
});
// a route may turn a page into a ticket; it may never turn a ticket into a page
```

**B · Routes on each operation**

```ts
export default Blueprint.operation(Link, { budget: { p95: "150 millis" }, alertTo: "payments-team" });
```

**C · Hand-configured in the sink**

```text
Axiom UI → Monitors → Notifiers → (clicked per environment, not in the repo)
```

**You do X → what happens**

| Scenario | A · environment file | B · per operation | C · in the sink |
|---|---|---|---|
| You add staging | Copy one `alerts` line, or take the default | Every operation already routes the same way everywhere | Click it all again |
| You swap Axiom for Grafana | The routes move with the file | The same | Rebuilt by hand |
| Someone wants a refusal spike to page | `ortho check` refuses: routes can only lower | Possible, by accident | Possible, silently |
| You review a pull request | The route change is in the diff | Spread over many files | Invisible |

**Rubric**

| Axis | A · environment file | B · per operation | C · in the sink |
|---|---|---|---|
| Floor-first | ✅ the default needs no route | ✅ | ❌ manual |
| Reversibility | ✅ one file | ⚠️ many files | ❌ no history |
| Blast radius | ✅ one optional field | ⚠️ every operation | ⚠️ outside the repo |
| Correctness | ✅ lowering only, checked | ⚠️ a page can come from anywhere | ❌ drifts |
| Fit | ✅ a binding, by K17 | ❌ an environment concern in the operation | ❌ against "falls out" |

**Recommendation: A.** Routes are bindings, so they sit next to the sinks. "Lowering only" means the model's own
severity is the most anyone can be woken for.

## Addendum, 21 November 2026 (M1.49's check, the checks author): the fixed shapes

Nothing above changes. Where K18 left a shape open, check 39 (`e2e/m1/39-m1-49-monitor-derived.test.ts`) fixes it, and this is the one place that records it. A builder owes
these; changing one is the author's, with a reason.

- **Rules.** `model.alertRules` in `generated/model/model.json` and in the portal's `generated/portal/blueprint.json` (the wire keeps it). Each is
  `{ id, kind: latency | defect | anomaly | verdict, labels, ... }`. Ids: `latency:<operation>`, `defect:<operation>`, `anomaly:<code>`,
  `verdict:<journey name>:<environment>`. Labels are exactly `environment` (`*` for latency, defect and anomaly; the environment's name on a verdict), the subject
  (`operation`, `code` or `journey`), `severity` (page, except an anomaly: ticket) and `owner` (the operation's or journey's `file`; for an anomaly the file of the thing
  whose errors declare the code, `orthograph` for the runtime's). A latency or defect rule has `target`, `windowDays`, `minCalls` and three `alerts` (fast, slow, ticket);
  a latency rule also `thresholdMs`, the operation's `budget.p95Ms`.
- **Firing.** A burn alert fires when `bad >= burn * (1 - target) * calls` holds over both its windows (equality fires; decided in integers, never by dividing floats) and
  its short window held at least `minCalls` calls. Every call in the window counts, a refusal included: a refusal is a good call for the defect objective, and a latency call
  is bad when it took longer than `thresholdMs`, whatever it ended as. A defect call is bad when it ended as a defect.
- **The route.** `GET /_portal/v1/monitor?digest=<digest>`, guarded as `snapshot` is (400 without a digest, 409 for another blueprint's, 404 without a live source), answers
  `{ environment, now, alerts, issues }` evaluated over `live.source.window(ms, now)` and `live.metrics.window(ms, now)` for each window an alert names. The portal reads no
  clock and sends nothing from local.
- **Issues.** One per (operation, step, `error.tag`), the step being the deepest failing step span; a refusal opens none; `occurrences` counts calls, never evaluations.
  The defect span carries `error.tag` (the error's `_tag`, else its constructor name).
- **The ledger.** `PortalContext.ledger?: { get(key): Effect<unknown>, put(key, value): Effect<void> }`, opaque JSON by key. `firstSeen` and `lastSeen` are the call's
  start and the operation's declaration hash (`model.operations[op].hash`) in the wire in force then; `regressed` is the two hashes differing.
- **The pages.** `/portal/monitor/alerts`, `/portal/monitor/issues` and the worst-first list on `/portal`, with the `data-portal` hooks listed at the head of
  `e2e/m1/monitor-judge.ts`. An issue row also shows its occurrences and first and last seen, and an alert row its state, as text a person reads.

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | What ships first | A · new slice M1.49 after M1.13: rules and issues derived, local only |
| Q2 | Where targets come from | A · defaults from the budget, optional `slo` override |
| Q3 | A thing stuck in a state | A · `within` on the state, one signal per overstay; no counts |
| Q4 | Routes and severity | A · `alerts` on the environment file, which can only lower a severity |

**Answer key:** reply "K18 all A", or name the ones that differ, for example "K18 A A C A".
