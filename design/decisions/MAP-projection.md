# MAP-projection: the app projection

Decided 22 November 2026, Goal 6 slice 4 (framework builder). Builds K31 "What falls out" and K36 section 4 against the contract
the slice 2 checks chose (`e2e/portal-next/map/projection.test.ts`). `packages/projections/src/modules/app/`.

## What was decided

1. **One projection, `app`, mounted by `blueprint/projections/app.ts` (`Blueprint.use(app)`), writing `generated/app/`.** It is
   exported from `@orthograph/projections` like `server` or `mcp`, and only a project that mounts it gets the folder: a project
   that declares a map and does not mount it writes nothing, and a project that mounts no projection at all still gets the
   standing six, so acme's and Plugged In's output does not move (the byte-identical check).
2. **Six files, exactly:** `routes.json`, `navigation.json`, `palette.json`, `map.json` (data, two spaces, a newline) and
   `links.ts`, `palette.ts` (headed `// Generated from blueprint/projections/app.ts. Do not edit.`, which the renderer writes
   from the projection's `Generated from the blueprint.` line as it does for every projection). Pages are sorted by name;
   navigation groups keep the order declared.
3. **One view feeds all six.** `viewOf(model, project)` is the declared map (`model.app`) or the derived default, so the files
   cannot disagree about which they are showing. The view is never written into the model: the derived default exists only in
   this projection (K31 section 5).
4. **The derived default** (checked by the author): layout `sidebar`; home `home` at `/`, nothing shown or offered, described as
   "The things <project> is made of."; a page per thing, named by the thing, at `/things/<thing>`, parent `home`, `allowed:
   anyone`, offering every operation of the thing (sorted) and showing none, described by the thing's own description; one group
   `Things`, not folded. A declared map replaces all of it, not part of it.
5. **The palette** lists every page, then, for each page, each operation in its effective `offers`, by page and then name. An
   operation entry names its page, the component that offers it (`null` when the page itself does) and carries the operation's
   own `allowed`. `palette.ts` holds the same entries as data and `visibleTo(caller)`, which runs wherever the shell or an agent
   needs it: an anonymous caller passes only `anyone`; a person passes `anyone`, `signed-in` or any role (a role is decided on an
   instance, so it is not ruled out); an operation is visible when its page is and its own `allowed` passes. A page that allows
   nobody (`allowed: []`) is visible to nobody.
6. **`links.ts`** is `export const links = { <page>: (params) => "/" + encodeURIComponent(params.x) ... } as const`, a parameter
   always `string`, a page's key its name (quoted when it is not an identifier). A page not declared, a wrong parameter name and a
   missing one fail `tsc`, so `ortho check`, in the file that wrote the call. Fixed parts are written as JSON strings, so no
   route can break the template.
7. **The agent's map** is `map.json`: each page with its effective `shows` and `offers` and its components, each component with
   its own, which is K36's "the agent's map names the component on its page, with what it offers", as data.
8. **No file names a declaration as a string outside `generated/`**: pages, operations and components come from the model's names.

## Evidence

`map/projection` of `e2e:portal-next`: 16 of 16 pass, with `map/compiler` and `map/byte-identical` (41 together). Unit tests:
`packages/projections/src/modules/app/app.test.ts`.

## Reversible

Delete the module and its export line; a project that mounted it then names a projection that does not exist, which the compiler
reports on the mount file.
