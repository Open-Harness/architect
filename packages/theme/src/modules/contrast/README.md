# contrast

`Contrast.ratio(a, b)`: the WCAG contrast of two `oklch()` colors. It exists for its test, which checks the pairs UI SDK's
`styles.md` lists (text 4.5:1, control edges and rings 3:1) against the theme's own values in both schemes, so a value
change that breaks legibility fails here. It is pure math, with no browser; the same pairs were also read from Chromium's
computed colors when the values were chosen (`design/decisions/MAP-theme.md`).
