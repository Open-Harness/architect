# MAP-theme: the Orthograph theme

Decided 22 November 2026, Goal 6 slice 1 (builder). Follows K29 Q3. `@orthograph/theme` at `packages/theme`.

## What was decided

1. **One stylesheet, `@orthograph/theme/theme.css`, on UI SDK's 29 `--ui-*` tokens** (every one `@ui-sdk/core`'s `web.css` declares on
   `:root`: 19 values and 10 icons). It declares all of them itself and never names UI SDK's sheet. It sits in no `@layer`, so it
   wins over UI SDK's layered `web.css` whether it loads before or after it.
2. **Where the values came from: the old client's look**, read from HeroUI's own default theme (`@heroui/styles` 3.2.7,
   `themes/default/variables.css`), which the old portal ran on unchanged, plus `packages/portal/src/portal.css` (15px/1.5 text,
   0.8 to 1.5rem sizes) and the `portal-design` skill's "Look" (Plus Jakarta Sans, JetBrains Mono, muted descriptions, colour only
   for status and the one primary action):

   | UI SDK token | Light | Dark | From HeroUI |
   |---|---|---|---|
   | background | oklch(0.9702 0 0) | oklch(0.12 0.005 285.823) | `--background`, both as they were |
   | foreground | eclipse 0.2103 | snow 0.9911 | `--foreground` |
   | muted (fills) | 0.9373 | 0.257 | `--surface-tertiary` / `--surface-secondary` |
   | muted-foreground | 0.5017 | 0.705 | `--muted`; light darkened from 0.5517 |
   | border | 0.9 | 0.28 | `--border` |
   | primary, ring | 0.55 0.2 254 (dark ring 0.62 0.195 253.83) | same | `--accent` (hue and chroma); primary darkened |
   | destructive | 0.55 0.2328 25.74 | 0.68 0.1967 24.63 | `--danger` |
   | overlay, shadow | 0.5 black; HeroUI overlay shadow | 0.6 black; its inset highlight plus a drop | `--backdrop`, `--overlay-shadow` |
   | radius, font size | 0.5rem, 15px at 1.5 | same | `--radius`, `portal.css` body |

   `input` has no HeroUI counterpart (its fields had no border); it is chosen to give a 3:1 edge.
3. **Deviations, all for contrast.** HeroUI's accent (0.6204) under its own white text is 3.9:1, so primary is 0.55; HeroUI's
   light muted text on the muted fill is about 4.0:1, so it is 0.5017; HeroUI's danger as text is 3.6:1 on light, so light
   destructive is 0.55 and dark is lighter. Every pair `styles.md` lists is held by a unit test (pure oklch math) and was read
   again in Chromium from canvas-computed colours: light 16.25, 5.46, 4.95, 4.74, 4.86 (text) and 3.61, 4.46, 4.46 (edges);
   dark 19.74, 7.72, 5.98, 4.74, 6.43 and 3.65, 5.50, 5.50.
4. **How the schemes switch.** Light is the base on `:root` (`color-scheme: light`); `@media (prefers-color-scheme: dark)` sets
   `color-scheme: dark` and the dark values; `:root[data-theme="light"]` and `:root[data-theme="dark"]` each set `color-scheme` and
   their values in full, and an attribute selector outweighs the media rule, so `data-theme` wins both ways. Each scheme is written out, with no
   `light-dark()`, because a custom property does not resolve it. "Dark first" is the design's starting point; with no system
   preference the page is light, as a browser reports it.
5. **The type scale and spacing**, as `--theme-*` properties (not `--ui-*`, which stays UI SDK's list): text xs 0.75, sm 0.85,
   base 0.9375, lg 1.1, xl 1.5, 2xl 2rem; leading tight 1.25 and normal 1.5; weights 400, 500, 600; space 1, 2, 3, 4, 6, 8, 12,
   16 as `calc(var(--ui-spacing) * n)`, so the one unit (0.25rem, the old `--spacing`) moves them all. The sizes are the old
   stylesheet's, rounded onto a ladder.
6. **One source of truth.** `modules/tokens` holds every value; `modules/stylesheet` renders the CSS from it at build
   (`dist/theme.css`, opening with a "Generated from … Do not edit." comment), and a unit test reads the CSS back through the
   cascade for each way a scheme is chosen and holds it equal to `tokens`.
7. **No font package.** The stacks name Plus Jakarta Sans and JetBrains Mono with system fallbacks. A font package is a new
   dependency that needs the lead's yes, and the old portal never shipped the fonts either (its body was `system-ui`). A page
   that wants them loads them; the names are already in the stacks.
8. **The pin.** `@ui-sdk/*` is at `0.1.0-beta.10`, where K29 read beta.7. K29's own list of the changes from beta.7 to beta.13
   shows nothing we rely on broke, and beta.10 is the newest that passed R1's three days on 22 November. Goal 5 is told through
   Ask #465.

## Not done here

The theme takes no dependency (not even `@ui-sdk/core`: the check in `e2e/portal-next` reads `web.css` itself). Loading the
fonts, and a page's own element rules beyond `body` and the mono elements, belong to the shell and the client.

## Supersedes

None.
