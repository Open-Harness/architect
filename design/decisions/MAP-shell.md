# MAP-shell: the shell

Decided 22 November 2026, Goal 6 slice 5 (framework builder). Builds K31 sections 3 and 4 against the contract the slice 2 checks chose
(the header of `e2e/portal-next/shell/shell.test.ts`). `@orthograph/shell` at `packages/shell`.

## What was decided

1. **The router is a small runtime over `routes.json`, with no dependency** (K31). A path is segments; a segment is literal text, or literal
   text then `:name` running to the segment's end (`@:handle` is "@" then the handle, which is what the declared route `/@:handle` needs). A
   parameter takes at least one character. Each segment is percent-decoded as UTF-8 by hand (`decodeURIComponent` throws, and errors are
   values), and a malformed one is no match. When two routes could match, the one with more literal segments wins, whatever the table's
   order. A path no route matches is the shell's own 404 (`data-status="404"`, `data-page=""`), never a blank, and the page's painter is
   not called. A trailing slash is the same address. `href(page, params)` is the typed link, each parameter `encodeURIComponent`ed.
2. **A page is a link where the route has its parameters.** The navigation and the breadcrumb ask the router for each page's address with the
   current route's parameters; `undefined` is a page drawn and no link. In the navigation such a page is a disabled line
   (`aria-disabled="true"`), and is not a `NavigationMenuItem`, so the bridge lists only the links an agent could follow. A folded group
   starts closed even when the current page is in it, and its panel is not `keepMounted`, so a closed group has no links in the page or
   for the bridge until `setOpen` opens it.
3. **Every navigation item is a `NavigationMenuItem` whose `value` is its page's name**, read from `navigation.json`, never typed. The link
   inside is `NavigationMenuLink` rendered as the shell's own `a` (`render`), which navigates through the History API on a plain click and
   leaves a modified click, a middle click and `target` to the browser. `web.css` fills any link that has a `data-current` attribute, and the
   check wants `data-current="false"` on the others, so the shell sets the fill back for `false` in its own rules.
4. **The palette is UI SDK's `dialog` holding a `command` named Search**, open on Meta+K and on Control+K (one `keydown` listener on the
   document, so both work on every platform; the dialog's `shortcut` would take only the platform's own). Its rows are `command-item`s
   whose text is exactly the page's or operation's name; a row's `onSelect` is the move (the check's `setValue` then `run`). A page row
   navigates. An operation row hands its entry to the app's `onOperation` and closes: the shell calls no operation itself, since calling
   is the generated actions' job (K29) and the shell takes no wire. A page row the current route has no parameters for is listed (the
   check lists every page the caller may open) and disabled, so it cannot be chosen into nothing.
5. **What the caller sees is the rule the generated `palette.ts` carries**, written once more in `modules/palette`. Why not read the generated one: `palette.ts` is project code the shell never imports, and its
   `visibleTo(caller)` does not narrow operations to the page shown, which the palette must (K31 section 4), so the shell would filter again anyway.
   Handing the function in would add a prop for no saving. The copy is eight lines; `e2e/portal-next/shell` checks its lists against the projection's, and
   `map/projection` checks the generated rule, so drift fails a check. The rule: an anonymous caller passes only `anyone`; a person passes any non-empty
   `allowed`; an operation also needs its page open, and is listed only on its own page.
6. **The layouts draw the same parts in their own places.** `sidebar`: the sidebar holds `header`, `switcher`, `nav`, `footer`; the main column
   has a bar with the breadcrumb, the palette's button and `actions`. `topNav`: the top bar holds `header`, `switcher`, `nav`, the button and
   `actions`; `footer` sits under the page. `none`: only the page, with no region, slot or breadcrumb, and no palette button; the keyboard
   still opens the palette there, so an agent and a keyboard keep the way across the app. A slot is drawn empty until a feature fills it
   (a function that paints into the element and may return its cleanup); the shell puts nothing of its own in `header`, `switcher`,
   `footer` or `actions`. An unknown layout name is the sidebar.
7. **The breadcrumb is the chain of parents, home first**; a chain that does not reach `home` starts with it. Each crumb before the last is a
   link where the route has its parameters, and the last is the page, current, no link.
8. **`mountShell(root, props)` makes the agent once** (`createAgent` of `@ui-sdk/react/agent`) and returns `{ agent, unmount, navigate }`.
   `props.agent` passes `createAgent`'s own options (`allow`, `timeout`) through. It is the only place that touches `window`.
9. **The shell's rules are in the package, not in a stylesheet a page must link.** `mountShell` adds one `<style>` (the frame's regions,
   the navigation's rows, the palette's dialog) on `--ui-*` and the theme's `--theme-*` tokens, each with a fallback, in no `@layer`, so it
   wins over `web.css`. A page links `@ui-sdk/core/web.css` and `@orthograph/theme/theme.css` and nothing else. The shell does not depend on
   `@orthograph/theme`, since it reads no value from it at build; the boundary line allows it (`scope:theme`).
10. **Shape.** Six modules, each with the six slots: `router`, `navigation`, `palette` (pure), `history` (the History API behind one
    interface; its tests use the small fake in its `internal/`), `styles`, and `frame` (the React parts, in `internal/*.tsx`, tested by
    rendering on the server). `main.ts` is the entry. The React parts are entry-like by nature, and use no `async`, `try`, `throw` or timer,
    so the Effect rule needed no exemption and the baseline gained nothing.
11. **Dependencies.** `@ui-sdk/core` and `@ui-sdk/react` at exactly `0.1.0-beta.10` (the theme's pin, MAP-theme), `react` and `react-dom` at
    `19.3.1` as peers and dev dependencies, `@types/react` and `@types/react-dom` at `19.3.0` as `packages/portal` has them; nothing else
    new, no router, no HeroUI. `.oxlintrc.json` gains `scope:shell`: it may depend on `scope:theme`, and import `react`, `react-dom`,
    `@ui-sdk/core` and `@ui-sdk/react`, and nothing else. `exports` points at `src/index.ts` as `packages/portal` does, with
    `publishConfig` for `dist`.

## What the agent reads

The check's `snapshot()` lists a `navigation-menu` Main, a `scroll-area` Navigation, a `collapsible` for each group (its title), the links as
the `items` of Main, and, while the palette is open, a `command` Search whose rows are the names. `act` of `setOpen` on a group's title opens
it; `setValue` of a row's name then `run` on Search moves. `navigation-menu` has no action that follows a link, so an agent moves by the
palette, as the check says. No `<button>` or `<input>` of the shell's is invisible to the bridge: the palette's trigger is a `DialogTrigger` and
its field a `CommandInput`.

## Not done here

The agent's `map` tool, `open(pages.x)` in `ortho prove` and the docs' page per screen are in `design/later.md` ("The rest of the app's
map"). Pages with `shows` and `offers` drawn from generated pieces are the web projection's (Goal 5) and the new client's.

## Evidence

`e2e:portal-next`, `shell/shell.test.ts`: 18 of 18 in Chromium, with the map's checks still green. Unit tests: `packages/shell/src/modules/*`
(26). `npx nx run-many -t lint,typecheck,test,build -p shell e2e` with `HEROUI_AUTH_TOKEN` unset.

## Supersedes

None.
