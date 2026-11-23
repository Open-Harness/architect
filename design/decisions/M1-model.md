# M1.03 complete model

The conductor's 18 November 2026 call is represented by `from: { kind: "app" }` or
`from: { kind: "feature" | "adapter", mount, package, version, thing }` on things and operations.
The existing package paths and mount names continue to drive imports.

`Blueprint.refAny()` declares a value with `{ declaration, id }` on the wire. The declaration is a compiled
thing name, including any mount prefix. The model marks the format as `ref-any` under the structured schema kind,
so the same records and verdict code can handle the object. The schema checks the name's shape and requires a nonempty id.
Checking whether that instance exists belongs to the operation using the reference. API, SDK and MCP use the
declaration's schema. A generated CLI flag accepts the reference as JSON.

The model keys journeys by their project-relative file or package specifier. It names their cast, starting world,
calls, symbolic references and assertions. Selectors are identified by the authored file and assertion position. Starting worlds are keyed by their declared name. Role rules include
the predicate source. Marked private call and assertion fields redact literals. The original journey declarations
remain the proof runner's input. A step whose operation was omitted is marked as skipped in the model.

A blank within an operation's steps has type `blank` and its reason is on the operation and in the model's
`blanks` index. This preserves the existing entry points for work's `mission.tasks`. An operation with an
entire declaration part missing appears in `blankOperations`, outside the executable operation list.

## Proof

Run `node packages/cli/src/main.ts describe --json --root examples/acme` and repeat for `examples/work`.
Acme has eleven journeys and three starting worlds. Work has no journey or starting-world files, and
`mission.tasks` reports the `steps.facts` blank. Both return named role rules and app origins.

In an acme copy, set the health payload to `{ target: Blueprint.refAny() }`. After `ortho generate`, compare
`generated/model/model.json` with `ortho describe --json`. They match byte for byte. The generated endpoint
decodes a reference to an allowance and rejects an empty declaration. Its CLI accepts a JSON object and its docs
display the field as an any-thing reference.

Checks 05 through 08 passed 39 tests locally. The omitted-operation journey through the Docker-backed collector
was excluded as directed by the thread brief. The workerd route checks in 08 ran locally.

## Journeys are an input to generate (lead, 19 November 2026)

Since M1.03 the model holds the journeys and starting worlds, and `generated/model/model.json` and the portal's
`generated/portal/blueprint.json` are written from it. So writing or editing a journey changes what `ortho generate`
writes, like any declaration, and `ortho check` reports drift until it is run. Evidence: layer1 check 06 copied acme's
`journeys/` into the starter after generating and then ran `ortho check`, which named both files (CI run 44423190046).
The authoring loop is therefore: write the journeys, generate, check. The check was updated by an author to say so;
`ortho dev` and `ortho watch` already regenerate on every change.

## A new journey does not stale a proof (lead, 19 November 2026)

M1.04 first fingerprinted every journey that exercises an operation, so adding `allowance.list` with its journey
(`an-owner-lists-allowances`, standing on `founded`) staled `allowance.grant` and `organization.create`, against
D3 #15.3 (layer2 check 3: a new read is minor, `stale none`). The fingerprint now covers only the journeys that judged
the operation: each must still exist, still exercise it, and be unchanged with its starting worlds. A journey added
later is new evidence for the next prove, not a change to this proof. Editing or removing a journey that judged it
still stales it. See `storyHash` and `evidenceHolds` in `packages/prove/src/modules/verdicts/internal/proof.ts`.
