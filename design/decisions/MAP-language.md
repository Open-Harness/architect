# MAP-language: the map language and its compiler module

Decided 22 November 2026, Goal 6 slice 3 (framework builder). Builds K31 and K36 against the contract the slice 2 checks chose
(`e2e/portal-next/map/compiler.test.ts`). `packages/orthograph/src/modules/app/` and `packages/compiler/src/modules/app/`.

## What was decided

1. **The language is five frozen declarations**, spread into `Blueprint` as one `Apps` object: `Blueprint.app`, `.page`,
   `.component`, `.layout` (`sidebar`, `topNav`, `none`) and `.nav.group` (`folded` defaults to false). Each carries a `kind`
   (`app`, `app-page`, `app-component`, `app-layout`, `app-nav-group`) and no name: the file's name is the name. A page's
   type is `AppPage`.
2. **Identity names everything.** A page, a component, an operation, a role and a thing are each the very object its own file
   exported, so the compiler looks the name up by object identity (the way `describe` does for roles and errors). A page value
   that no file of `blueprint/app/pages/` exports is "undeclared", which is how `home`, a nav group's page or a `parent` that is
   not a page file is caught, and how a page re-exported from another folder is refused.
3. **`parent` is a page or a thunk.** The compiler calls a thunk after every module is loaded, so two pages that name each
   other can be written with plain imports. A thunk that throws (a parent read before its module initialised) is not
   caught: a defect, not a refusal, since no handler may use `try` (AGENTS.md).
4. **`shows` and `offers` take operations and reads**, as `shows: [get]` in K31 does (Plugged In's `profile.get` is an
   operation). The model holds a page's effective lists, as names, each once: its own, then each component's in the order the
   page holds them. A component keeps its own.
5. **The refusals, six tags `[app-...]`.** K31's four checks and K36's one come to six tags in the author's contract (K31's third bullet is two:
   undeclared page and parent cycle). Each is a problem `<file>: [<tag>] <words>`; the file is
   the page, or `blueprint/app/app.ts` for `home` and the navigation, and any other file the problem involves is named in the
   words (a component that brought the read, the second page at an address, the pages of a cycle).
   - `app-route-param`: the path's `:names` and `route.params` must be the same set; and, only when the page shows at least
     one read, each shown read's payload field is supplied (by a parameter of the same name, or of the same thing field, or
     because it is optional, or because an `allowed` role-of reads it) and each parameter is taken by some shown read. **A page
     that shows no read is checked for none of this** except the first (K31).
   - `app-offer-uncallable`: an offered operation callable by none of the page's `allowed`: callable when the page allows
     `anyone` or `signed-in`, or the operation allows `anyone` or `signed-in` (a role implies a signed-in person), or they share
     a role. A role scoped by `of(path)` counts as its role.
   - `app-undeclared-page`, `app-parent-cycle` (each cycle once, not the pages that merely lead into it),
     `app-duplicate-route` (addresses equal once every `:name` is taken out, so `/@:handle` and `/@:name` clash),
     `app-named-twice` (a read or operation named twice anywhere among a page and its components, a read counting against an
     operation of the same name).
   - Plain problems with no tag, for things the five do not cover: a page holding a component that is not a file of
     `components/`, a page naming an operation not in the blueprint, an `app/` folder with no `app.ts`, a default export of the
     wrong kind.
6. **Session is not modelled.** K31 says a read's payload field may be supplied by "session"; nothing in a payload comes from the
   session today (the runtime reads the caller itself), so no field is supplied that way. If one ever is, it is one more clause
   in `routeProblems`.
7. **Hashing.** Every page, component and the app carry a hash by the model's own rule (sha256 over sorted-key JSON). The app's
   hash covers its own fields and every page's and component's hash; a page's covers its name, file, route, parent's name,
   `allowed`, effective lists and components, so a changed component changes the pages that hold it and no other page.
8. **Registered in exactly the bound's four lines:** `Apps` spread into `Blueprint` and the types exported in
   `orthograph/src/index.ts`; `App.setAside(files)` before `readLayout` and `App.describe(...)` after `describe` in the model
   service, `app` added only when declared; `readonly app?: AppModel` on `Model`. Files under `blueprint/app/` other than
   `app.ts`, `pages/<name>.ts` and `components/<name>.ts` are the author's own helpers and are left alone (the checks'
   `ghost.ts` is one).
9. **One copy of the hash.** `app/internal/hash.ts` repeats the model's twelve-line hash because a module may not import its
   neighbour's `internal/`, and `model/service.ts` (which exports `canonical`) imports this module. Two copies of a pure function
   beat a cycle; if the hash changes, the byte-identical check and the app hash tests say so.

## Evidence

`nx run e2e:portal-next` map/compiler and map/byte-identical: 25 of 25 pass (the byte-identical check passed before and passes
with the modules in). Unit tests: `packages/orthograph/src/modules/app/app.test.ts`, `packages/compiler/src/modules/app/app.test.ts`.

## Reversible

Delete the two `app` folders and the four registering lines; a blueprint with no `app/` folder never ran any of it.

## The `[tag]` format, and why

Every other compile error of the model is `<file>: <words>`, with nothing that names its kind; none uses a `[tag]`. The six map
refusals are `<file>: [<tag>] <words>` because the slice 2 checks (`e2e/portal-next/map/compiler.test.ts`, contract chosen by the
checks' author and passed by the 🔍 review of #510) must tell six refusals apart, and say that a fixture produced exactly its one
kind, without matching prose that a rewording would break. The file stays first, so the line still reads as the model's other
problems do and `Mounts.attributed` and the CLI treat it alike; the tag is a stable name for the kind, like a refusal code. It is
new to the compiler, so it is recorded here rather than assumed: the tags are `app-route-param`, `app-offer-uncallable`,
`app-undeclared-page`, `app-parent-cycle`, `app-duplicate-route` and `app-named-twice`. Plain problems of the map (see 5) carry none.

## Who may open a page, now that `allowed` has more kinds (22 November 2026, after merging `goal/stage-1`)

`Allowed` gained `system`, `keeper`, a role made for an outside service, and `narrowed` (an entry with its ways in kept). A page
is opened by the caller of a request, so: `system` and `keeper` have no credential and never open a page, and a service role
admits one outside mount, never a person at a page; each is a problem naming the page's file (untagged: it is none of the six).
A `narrowed` entry is the entry it narrows, since a page has no ways in of its own, and the model holds the plain entry.

## Route grammar, and scoped service roles (after Codex's review of #584)

- **One grammar for a route**, for the compiler, the projection and the shell's router: a segment is literal text with at most one
  `:name` at its end (`@:handle`, `:id`, `about`). `/:year-:month`, `/:a:b` and `/:id.json` are refused as `[app-route-param]`,
  naming the page's file and the segment, because the router reads everything after the first colon as one parameter and could not
  match them. `@:handle` stays allowed, not only a whole-segment `:name`, since `/@:handle` is K31's own example and the router reads it.
- **A scoped service role is still a service role.** `serviceRole.of("id")` is a `role-of`, so the refusal checks the role it
  scopes, narrowed or not.

## Empty segments (after Codex's review of the map landing)

A route other than `/` may not have an empty segment: `/account/` and `/a//b` are refused as `[app-route-param]`, naming the page's
file, because the shell's router drops empty segments and the page would answer at another page's address. So no two routes the
compiler accepts can collide after the router normalizes them, and the duplicate check needs no normalizing of its own.

A route parameter may not be money (M6-money, from stage 1 on 23 November 2026): an address carries an id or text, never an amount
and its asset, so `paramOf` refuses it, naming the page's file. The money value's declared meta (an asset object) and the model's
(the asset's name) differ, and no page needs the conversion.
