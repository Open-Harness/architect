# tokens

The theme's values, written once: the 29 `--ui-*` tokens UI SDK's `web.css` declares on `:root`, in `light` and in
`dark`, and the type scale and spacing (`--theme-*`). `types.ts` is the shape; `service.ts` assembles `theme`;
`internal/` holds the values by kind (scheme-specific, shared, icons, scale), each with where it came from.

Nothing here runs: it is data. The stylesheet module renders it into CSS, and the contrast module checks it.
