# K31 grill: the app's map

**Answered 21 November 2026: all A.** Aaron: "I agree with all of your defaults." Recorded in
[`../decisions/K31-app-map.md`](../decisions/K31-app-map.md).

Six questions for Aaron, 21 November 2026, from the 📐 designer thread, asked aloud (he listens rather than reads) and
drawn on the "App map grill" board (https://claude.ai/artifact/8V9XikbuMFRpFXiMzmAMJW): a dashboard shell coloured
by who decides each part, and the A answers written out. It came from his challenge to K29: the pieces are derived
from the data, but the app's map (shell, sidebar, switchers, top bar, routes, layout, palette) was left to hand code,
so none of it fell out.

**Words used in every question.** The *map* is the app's information architecture: its pages, their routes, how you
move between them, and the frame around them. The *shell* is that frame. A *page* is one screen at one route, fixed
(`/claim`) or dynamic (`/@:handle`). A *piece* is K29's generated part for one operation.

**Evidence.** The portal's frame is half derived and half hand-written (`packages/portal/src/modules/pages/internal/nav.ts`:
the things tree and the ⌘K index from the model, `PANELS` and the fixed pages by hand; `route.ts` matches every route
by hand). Plugged In has no map. UI SDK has no sidebar, breadcrumb, shell or router.

| # | Question | A (recommended, chosen) | B | C |
|---|---|---|---|---|
| 1 | Where does the map live? | the blueprint, its own declarations (`blueprint/app/`), in the model | settings on the web plugin: tied to the browser | app code with conventions: Orthograph reads code for meaning |
| 2 | What does a page declare? | the what: route and typed params, who, shows, offers, parent | the look too: a layout language that fights UI SDK | the route only: nothing falls out |
| 3 | How is the shell declared? | a layout with named slots, nav groups, switchers from mounted features | a scaffolded shell file you own; nothing falls out | one fixed shell |
| 4 | Palette, breadcrumbs, agent map? | derived from the map, with hide, rename and shortcut | declared per app | left to code (the portal today) |
| 5 | Defaults versus yours? | a derived default until you declare; page code follows the staleness ratchet | the default map scaffolded once as files; drift unseen | no default |
| 6 | The portal, and when? | same language; pages and routes first, the shell with the new portal | same language, after the beta | everything before the beta |

Each A was graded floor-first (a real map now, not a promise), reversible (one file per page, data in the model),
small in blast radius (new declarations and new packages beside K29's), and the fit with "write it once, everything
falls out".
