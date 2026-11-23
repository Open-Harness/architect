# router

The router is ours, a small runtime over the generated route table (`generated/app/routes.json`), with no router dependency (K31). A
route is its path with `:name` parameters; a segment is literal text, or literal text then `:name` running to the segment's end
(`@:handle`). A pathname matches by segments, each percent-decoded as UTF-8 (a malformed one is no match). When two routes could
match, the one with more literal segments wins. A path no route matches is `undefined`, which the shell draws as its 404.

`href(page, params)` is the typed link: the page's path with each parameter percent-encoded, or `undefined` when one is missing. The
navigation and the breadcrumb pass the current route's parameters to it, so a page is a link only where the route has every
parameter the page needs. `chain(page)` is the parents from home to the page, for the breadcrumb.

The module is pure: it knows nothing of the browser. `history` carries the address.
