# @orthograph/shell

The app's frame (K31, `design/decisions/MAP-shell.md`): a router over the generated route table and the History API, the layouts
`sidebar`, `topNav` and `none` with their named slots, the foldable navigation, the breadcrumb and the ⌘K palette, on UI SDK
(`navigation-menu`, `collapsible`, `scroll-area`, `command`, `dialog`) and the Orthograph theme, and readable by an agent through UI SDK's
`createAgent`. No router dependency, no HeroUI.

```ts
import { mountShell } from "@orthograph/shell";
import routes from "./generated/app/routes.json";
import navigation from "./generated/app/navigation.json";
import map from "./generated/app/map.json";
import palette from "./generated/app/palette.json";

const { agent, navigate, unmount } = mountShell(document.getElementById("root")!, {
  routes, navigation, map, palette: palette.entries,
  caller: "person",
  pages: { home: (el) => { el.textContent = "home"; } }, // a page paints itself into the element the shell gives it
  slots: { header: (el) => { el.textContent = "My app"; } },
});
```

Link `@ui-sdk/core/web.css`, then `@orthograph/theme/theme.css`. The props and the `data-shell` hooks are the contract at the top of
`e2e/portal-next/shell/shell.test.ts`.

`src/main.ts` is the entry (`mountShell`); `src/modules/` holds `router`, `navigation`, `palette`, `history`, `styles` and `frame`,
each with the six slots.
