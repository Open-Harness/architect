# stylesheet

Renders the theme into CSS: `Stylesheet.render(theme)` is a pure function of `tokens` and `scale`, so the stylesheet and
the values cannot drift. Light is the base on `:root`; dark follows `prefers-color-scheme: dark`; `data-theme="light"` or
`data-theme="dark"` on `<html>` overrides the system both ways (an attribute selector outweighs the media rule). Each
scheme is written out in full, never with `light-dark()`, because a custom property does not resolve it.

The package's `main.ts` writes the result to `dist/theme.css` on build; `stylesheet.test.ts` reads it back and holds it
equal to the tokens.
