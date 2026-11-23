// The navigation: groups as quiet headings that fold, pages as rows, the page shown marked by a fill and a heavier weight. `web.css` fills any link
// that has a `data-current` attribute, and every item carries one (`true` or `false`, so a selector can ask either), so the fill is set back here.
export const navigation = `
[data-shell-slot="nav"] [data-slot="scroll-area"] { border: 0; border-radius: 0; }
[data-shell-slot="nav"] [data-slot="scroll-area-content"] { padding: 0; }
[data-shell="nav"] { display: flex; flex-direction: column; gap: var(--theme-space-3, 0.75rem); }
[data-shell="nav-group"] > [data-slot="collapsible-trigger"] {
  inline-size: 100%;
  justify-content: space-between;
  border-color: transparent;
  background: transparent;
  color: var(--ui-muted-foreground);
  font-size: var(--theme-text-xs, 0.75rem);
  font-weight: var(--theme-weight-semibold, 600);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
[data-shell="nav-group"] > [data-slot="collapsible-trigger"]:hover { color: var(--ui-foreground); background: var(--ui-muted); }
[data-shell="nav-group"] ul { margin: 0; padding: 0; list-style: none; }
[data-shell="nav-item"] {
  display: flex;
  align-items: center;
  block-size: auto;
  padding: var(--theme-space-2, 0.5rem) var(--theme-space-3, 0.75rem);
  border-radius: var(--ui-radius);
  background: transparent;
  color: var(--ui-foreground);
  font-size: var(--theme-text-sm, 0.85rem);
  font-weight: var(--theme-weight-regular, 400);
  text-decoration: none;
}
a[data-shell="nav-item"]:hover { background: var(--ui-muted); }
[data-shell="nav-item"][data-current="true"] { background: var(--ui-muted); font-weight: var(--theme-weight-semibold, 600); }
[data-shell="nav-item"][aria-disabled="true"] { color: var(--ui-muted-foreground); cursor: not-allowed; }

[data-layout="topNav"] [data-shell="nav"] { flex-direction: row; align-items: center; gap: var(--theme-space-4, 1rem); }
[data-layout="topNav"] [data-shell="nav-group"] { position: relative; display: flex; align-items: center; gap: var(--theme-space-1, 0.25rem); }
[data-layout="topNav"] [data-shell="nav-group"] > [data-slot="collapsible-trigger"] { inline-size: auto; gap: var(--theme-space-2, 0.5rem); }
[data-layout="topNav"] [data-shell="nav-group"] ul { display: flex; gap: var(--theme-space-1, 0.25rem); }
[data-layout="topNav"] [data-shell="nav-group"][data-folded="true"] [data-slot="collapsible-panel"] {
  position: absolute;
  inset-block-start: 100%;
  inset-inline-start: 0;
  z-index: 2;
  min-inline-size: 12rem;
  padding: var(--theme-space-1, 0.25rem);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-background);
  box-shadow: var(--ui-shadow);
}
[data-layout="topNav"] [data-shell="nav-group"][data-folded="true"] ul { flex-direction: column; }
`;
