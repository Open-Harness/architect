# @orthograph/portal-ui

The components of the Orthograph portal and the Factory face, under our names. This is the only package that imports
[HeroUI Pro](https://heroui.pro); the portal's pages and every face import from here, and a lint rule (`no-restricted-imports`)
fails any other import of Pro's package, in a package or in generated code (F7, `design/decisions/F7-portal-ui-seam.md`).

```ts
import { Board, Chart, Chat, Shell, Stat } from "@orthograph/portal-ui";
```

| Ours | Built on |
|---|---|
| `Shell` (`Layout`, `Tree`, `TopBar`, `Rail`, `Drawer`) | `AppLayout`, `Sidebar`, `Navbar` |
| `Board` | `Kanban` |
| `Grid` | `DataGrid` |
| `Chart` (`Area`, `Bar`, `Line`) | `AreaChart`, `BarChart`, `LineChart` |
| `Stat`, `StatGroup`, `StatValue`, `StatTrend` | `KPI`, `KPIGroup`, `NumberValue`, `TrendChip` |
| `Card`, `CardGroup`, `Peek` | `ItemCard`, `ItemCardGroup`, `HoverCard` |
| `Widget`, `Timeline`, `Command`, `Markdown` | the same names |
| `Code`, `Editor` | `CodeBlock`, `RichTextEditor` |
| `Chat` (twelve parts) | `ChatConversation`, `ChatMessage`, `ChatTool`, `PromptInput` and the rest |

## HeroUI Pro is a peer dependency, and you license it yourself

Pro's React package is a `peerDependency`. This package never contains it, copies it or bundles it: its `dist` holds only our
re-exports, with Pro's package left as an import. Whoever installs the portal installs Pro with their own HeroUI Pro
licence (HeroUI's terms, not ours), and Pro's own peers (React, `@heroui/react`, Tailwind and the rest) are installed alongside it. Without a
licence the portal's pages do not render. If that ever stops being acceptable, the same exports can be rebuilt on free HeroUI 3
with no change to a page (F7 decision 5).

## For people working in this repository

`pnpm install` gives you the registry's empty shell of Pro (its installer is switched off in `pnpm-workspace.yaml`), so a plain
install, `nx lint`, `nx test` and `nx build portal-ui` all work without a licence: the build only re-emits our re-exports and
declares their types without reading Pro. `nx typecheck portal-ui` needs the real build and says so when it is missing.

- On your machine, with a licence: `npx heroui-pro login`, then `npx heroui-pro install`.
- In CI: the `portal-ui` job installs Pro from the `HEROUI_AUTH_TOKEN` secret, caches it by the lockfile, builds and typechecks
  this package and runs check 15. It never runs for a pull request from a fork, so the secret never reaches code we did not
  write. `tools/pro.mjs` is the one script that touches the install; it never reads or prints the credential.

Never commit Pro, a copy of it or its token.

## Publishing

`nx build portal-ui`, then `npm pack --dry-run` in this folder lists the tarball: `package.json`, `README.md`, `LICENSE` and
`dist/`. Publishing is Aaron's, after Gate M1.

## Licence

Apache-2.0 for the files of this package (`LICENSE`). HeroUI Pro is not covered by it.
