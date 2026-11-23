# @orthograph/theme

The look every Orthograph screen shares: one stylesheet on UI SDK's `--ui-*` tokens, light and dark, with the type scale and
spacing. Goal 6, slice 1; its calls are in `design/decisions/MAP-theme.md`.

```html
<link rel="stylesheet" href="…/@orthograph/theme/theme.css" />   <!-- after UI SDK's web.css, if the page loads it -->
<html data-theme="dark">                                          <!-- optional: light or dark wins over the system -->
```

```ts
import { tokens, scale } from "@orthograph/theme";
tokens.dark["--ui-background"]; // "oklch(0.12 0.005 285.823)"
scale["--theme-text-sm"];       // "0.85rem"
```

- The stylesheet declares every token itself (the 29 UI SDK's `web.css` sets on `:root`), never `light-dark()`, and never
  names UI SDK's own sheet. It follows `prefers-color-scheme`; `data-theme="light|dark"` on `<html>` overrides it.
- Fonts are named, not shipped: Plus Jakarta Sans for text, JetBrains Mono for names, ids and times, each with system
  fallbacks. A page that wants them loads them.
- The stylesheet is rendered from the tokens at build (`dist/theme.css`), so the two cannot drift.
- Depends on nothing of ours and nothing in it imports HeroUI.

Modules (`src/modules/`): `tokens` (the values), `stylesheet` (the render), `contrast` (the legibility check).
