# pages

A body for each page of the app's map, by the page's name in `generated/app/routes.json`. The shell matches the address and gives a page its element
and its parameters (`PageFn`); `painters(deps)` makes one for each page, each drawing from the one store the data API fills, inside the frame.

Built here (slice 6): home (the things as cards under the frame), a thing's page (its lifecycle, the rail scoped to it), an operation's page (its
name and description), and an environment's page (whether this portal reads it or another's). Every other page is a stub carrying its
`data-portal="page"` hook and the frame, with the slice that draws it named: slice 7 the operation's five tabs and the thing's tables, slice 8
environments, compare, journeys and starting worlds, slice 9 reference and plugins, slice 10 monitor and traces. A route that names a thing, an
operation or an environment the blueprint does not declare is a 404 page (`data-status="404"`). Test: `pages.test.ts`.
