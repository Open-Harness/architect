# navigation

`generated/app/navigation.json` (the groups, in the order declared, each foldable) resolved against the route shown. `derive`
gives each page of a group its address through the router's `href` called with the current route's parameters, so a page is a link
only where the route has every parameter the page needs, and `current` marks the page shown. Pure data in, pure data out; the
React parts that draw it are in `frame`.

`Navigation.layoutOf` reads the layout the app names (`sidebar`, `topNav`, `none`), and takes the sidebar for any other word.
