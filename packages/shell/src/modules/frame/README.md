# frame

The React parts of the shell (K31 section 3), over what `router`, `navigation`, `palette` and `history` decide. `Frame.Shell` is the root;
`main.ts` mounts it. Every part is a UI SDK component, never a hand-written `role=`:

- the layouts (`sidebar`, `topNav`, `none`) and their named slots, `header`, `switcher`, `footer` and `actions` (a slot is drawn empty
  until a feature fills it; `nav` is the shell's own);
- the navigation: a `navigation-menu` named Main in a `scroll-area` named Navigation, each group a `collapsible` (not `keepMounted`, so a
  closed group has no links in the page or for an agent). A page is a `NavigationMenuItem` whose `value` is the page's name when it is a
  link on this route, and otherwise a disabled line that is no item;
- the breadcrumb, the page body (one element per route, painted by the page's own function; an address no route matches is the shell's 404),
  and the palette: a `dialog` holding a `command` named Search, open on Meta+K and Control+K.

Where a person and a selector look, the shell writes `data-shell` attributes (UI SDK keeps `data-slot`): `root`, `sidebar`, `topbar`, `slot`, `nav`,
`nav-group`, `nav-item`, `breadcrumb`, `crumb`, `page`, `palette`, `palette-item`. The contract is the header of
`e2e/portal-next/shell/shell.test.ts`.
