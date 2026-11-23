# build

`Build.build(root, env)`: a clean git revision’s Worker, bundled once by a credential-free wrangler dry run.
A dirty tree is refused before touching its deployable artefact. Local `dev` and local `prove` still run the
working tree; revision-based test/staging/production flows require a commit.

The portal's prebuilt client, when the project's `@orthograph/portal` has one, is copied beside the bundle as `portal/` (K19: static
assets the Worker serves at `/portal`); the dry run reads a config derived from the generated one (`server-config`).

A complete build is published atomically from a temporary directory to `.ortho/artefacts/<revision>/`.
`bundle.json` version 1 records the full clean source commit and sha256. A later build reuses that immutable
artefact, and `Build.find` verifies provenance, revision and bytes. Legacy, partial or altered records are refused:
remove that local artefact, rebuild it and prove it again. No legacy provenance is inferred.

The caller supplies the subprocess environment. Only tooling paths, locale, proxies and certificate settings reach
wrangler; no Cloudflare or other account credentials do. Expected failures are typed `BuildFailed` values.
The bundle hash travels in signed verdicts, so a revision-only old verdict cannot authorize these bytes (D3 #160–164).
Test: `build.test.ts`; `promote/promote.test.ts` covers proof identity and the real promotion flow.

For an existing legacy cache at a clean HEAD, move `.ortho/artefacts/REVISION` to
`.ortho/artefacts/REVISION.legacy`, using the revision named in the refusal. Run `ortho build`, then
`ortho prove --env test`, then promote through staging before production. This preserves the old cache for
inspection and every logbook row; the new proof, not the move or rebuild, supplies the missing hash. The legacy
cache recovery is exercised by `build.test.ts` with a real bundle rebuild.

A `Built` also exposes its full `commit`, from the manifest. `Build.unchanged(root, commit)` checks the same clean
full commit at a proof boundary. Promotion publishers archive that exact commit rather than reread mutable source.
