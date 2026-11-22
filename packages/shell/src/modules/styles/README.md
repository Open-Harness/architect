# styles

The rules the frame needs and UI SDK and the theme do not give: where the regions sit, the navigation's rows and the palette's
dialog. They use only UI SDK's `--ui-*` tokens and the theme's `--theme-*` scale (each with a plain fallback, so the shell is
readable before the theme loads), and sit in no `@layer`, so they win over `web.css`'s. `mountShell` puts them in the document once
(`Styles.install`); a page that mounts the shell links `@ui-sdk/core/web.css`, then `@orthograph/theme/theme.css`, and nothing else.
