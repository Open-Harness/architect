# palette

The palette's index (`generated/app/palette.json`: the pages by name, then each page's operations) filtered for the caller and the
page they are on: the pages they may open, and the operations they may call there (K31 section 4). The rule is the one the generated
`palette.ts` carries (an anonymous caller passes only `anyone`; a person passes any non-empty `allowed`, since a role is decided on an
instance), written again here because the shell is handed the entries as data and never imports a project's generated code.
`e2e/portal-next/shell` holds the two to the same list. The order is the index's own. Pure; `frame` draws it.
