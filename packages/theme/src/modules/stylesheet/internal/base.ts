// The few element rules that put the tokens to use, so a page that links only this sheet already looks like the portal. UI SDK's own
// parts are styled by its web.css; these are the page around them.
export const base = `body {
  margin: 0;
  background: var(--ui-background);
  color: var(--ui-foreground);
  font-family: var(--ui-font-sans);
  font-size: var(--theme-text-base);
  line-height: var(--theme-leading-normal);
}

code, kbd, samp, pre {
  font-family: var(--ui-font-mono);
}`;
