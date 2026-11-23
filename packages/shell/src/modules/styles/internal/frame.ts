// The regions: the sidebar or the top bar, the main column, the bar over the page, the slots and the breadcrumb.
export const frame = `
[data-shell="root"] {
  display: flex;
  min-height: 100vh;
  background: var(--ui-background);
  color: var(--ui-foreground);
  font-family: var(--ui-font-sans);
  font-size: var(--theme-text-base, 0.9375rem);
  line-height: var(--theme-leading-normal, 1.5);
}
[data-shell="root"][data-layout="topNav"] { flex-direction: column; }
[data-shell="root"][data-layout="none"] { display: block; }

[data-shell="sidebar"] {
  display: flex;
  flex-direction: column;
  gap: var(--theme-space-3, 0.75rem);
  box-sizing: border-box;
  inline-size: 16rem;
  flex-shrink: 0;
  position: sticky;
  inset-block-start: 0;
  block-size: 100vh;
  padding: var(--theme-space-4, 1rem);
  border-inline-end: 1px solid var(--ui-border);
}
[data-shell="sidebar"] [data-shell-slot="nav"] { flex: 1; min-block-size: 0; }

[data-shell="topbar"] {
  display: flex;
  align-items: center;
  gap: var(--theme-space-4, 1rem);
  padding: var(--theme-space-2, 0.5rem) var(--theme-space-4, 1rem);
  border-block-end: 1px solid var(--ui-border);
  background: var(--ui-background);
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
}
[data-shell="topbar"] [data-shell-slot="nav"] { flex: 1; min-inline-size: 0; }

[data-shell="main"] { display: flex; flex: 1; flex-direction: column; min-inline-size: 0; }
[data-shell="bar"] {
  display: flex;
  align-items: center;
  gap: var(--theme-space-4, 1rem);
  padding: var(--theme-space-2, 0.5rem) var(--theme-space-6, 1.5rem);
  border-block-end: 1px solid var(--ui-border);
}
[data-shell="bar"] nav[aria-label="Breadcrumb"] { flex: 1; }
[data-shell="main"] > nav[aria-label="Breadcrumb"] { padding: var(--theme-space-3, 0.75rem) var(--theme-space-6, 1.5rem) 0; }
[data-shell="page"] { flex: 1; padding: var(--theme-space-6, 1.5rem); }
[data-shell="main"] > [data-shell-slot="footer"] { padding: var(--theme-space-4, 1rem) var(--theme-space-6, 1.5rem); border-block-start: 1px solid var(--ui-border); }
[data-shell-slot]:empty { display: none; }

[data-shell="breadcrumb"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--theme-space-2, 0.5rem);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--theme-text-sm, 0.85rem);
  color: var(--ui-muted-foreground);
}
[data-shell="crumb"] + [data-shell="crumb"]::before { content: "/"; margin-inline-end: var(--theme-space-2, 0.5rem); }
[data-shell="crumb"] a { color: inherit; text-decoration: none; }
[data-shell="crumb"] a:hover { color: var(--ui-foreground); text-decoration: underline; }
[data-shell="crumb"][data-current="true"] { color: var(--ui-foreground); font-weight: var(--theme-weight-medium, 500); }
`;
