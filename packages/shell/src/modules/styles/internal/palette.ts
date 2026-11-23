// The palette: the button in the bar, and the dialog it opens, set near the top with its title read by screen readers only.
export const palette = `
[data-shell="palette-trigger"] { gap: var(--theme-space-3, 0.75rem); color: var(--ui-muted-foreground); }
[data-shell="palette-trigger"] kbd { font-family: var(--ui-font-mono); font-size: var(--theme-text-xs, 0.75rem); }
[data-shell="palette-title"] {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
[data-slot="dialog-content"]:has([data-shell="palette"]) {
  inset-block: 15vh auto;
  margin-block: 0;
  gap: 0;
  inline-size: min(36rem, calc(100vw - 2rem));
  padding: 0;
  overflow: hidden;
}
[data-shell="palette"] { inline-size: 100%; max-inline-size: none; border: 0; border-radius: 0; }
[data-shell="palette"] [data-slot="command-list"] { max-block-size: 20rem; overflow-y: auto; padding: var(--theme-space-2, 0.5rem); }
[data-shell="palette"] [data-slot="command-group-label"] {
  padding: var(--theme-space-2, 0.5rem) var(--theme-space-3, 0.75rem);
  color: var(--ui-muted-foreground);
  font-size: var(--theme-text-xs, 0.75rem);
  font-weight: var(--theme-weight-semibold, 600);
}
`;
