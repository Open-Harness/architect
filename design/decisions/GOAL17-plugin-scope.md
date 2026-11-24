# GOAL17-plugin-scope: a plugin written inside an app is a project of its own kind

Decided 23 November 2026 by Goal 17's slice 5 builder, under "Who decides" in `AGENTS.md`, after the 🔍 review of #670. It follows the
precedent of `M1-plugins.md` (a plugin is a package whose root export is its descriptor) and `M2-auth.md` (a plugin's own dependencies).

## The problem

Each plugin in `examples/superagent/plugins/<name>/` is a package, so Nx infers a project from its `package.json`. With no tags the
module-boundary rule refuses every import it makes ("a project without tags matching at least one constraint cannot depend on any
libraries"). The tag the example app has, `scope:project`, is the wrong one: `design/packages.md` lets a project depend only on
`orthograph`, the language, the host and the projections, and a plugin depends on other plugins (`intake` on `superagent`'s roles and
events, `tickets` on `intake`'s account role and on `agents`).

## The call

1. **A plugin is tagged `scope:plugin`, in its own `package.json`** (`"nx": { "tags": ["scope:plugin"] }`), because it has no
   `project.json`: it is a package, not an app, and the tag travels with the package when slice 14 moves it into `packages/`.
2. **`scope:plugin` may depend on `scope:orthograph`, `scope:language` and other `scope:plugin` packages.** Not the host, the
   generators or the projections: a plugin's code is blueprint and handlers, and nothing it makes runs the compiler.
3. **`scope:project` may also depend on `scope:plugin`.** An app mounts plugins, as it mounts a projection.
4. **Both constraint blocks of `.oxlintrc.json` say so**: the one for source files and the one for the `**/*.test.ts` override.
5. **Plugins do not depend on each other in a circle.** The order is `agents`, `superagent`, `intake`, `tickets`, `prompts`; a
   plugin that would need a later one names its thing by id instead (GOAL17-slice5-forms, call 15).

## Evidence

- `.oxlintrc.json`, the two `scope:plugin` constraints; `pnpm nx run superagent:lint` and `lint:lint` pass.
- `examples/superagent/plugins/*/package.json` and `packages/agents/package.json`.

## Supersedes

- `design/packages.md`: "A project (`scope:project`) depends only on `scope:orthograph`, `scope:language`, `scope:host` and `scope:projections`:" → "A project (`scope:project`) depends only on `scope:orthograph`, `scope:language`, `scope:host`, `scope:projections` and `scope:plugin`:"

**Added 23 November 2026, with #687.** Each plugin is also tagged `env:runtime`, as `orthograph` and the language are: a plugin runs in production and depends only on runtime libraries. That lets the checks (`e2e`, tagged `env:gate`) import a plugin's stand descriptor, as GOAL17-check-harness's journeys do.
