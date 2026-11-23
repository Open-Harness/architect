// The shell's own rules: where the regions sit, and how its parts look on the theme's tokens. UI SDK's `web.css` styles each component and the
// theme (`@orthograph/theme`) sets the tokens; this is only the frame around them, so a page that mounts the shell needs no third stylesheet.

export interface StylesApi {
  /** The rules as text. They sit in no layer, so they win over `web.css`'s, and use only `--ui-*` tokens and the theme's `--theme-*` scale. */
  readonly css: string;
  /** Put the rules in the document once; a second call finds them and does nothing. */
  readonly install: (doc: Document) => void;
}
