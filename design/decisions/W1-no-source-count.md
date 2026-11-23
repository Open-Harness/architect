# W1: a count with no metrics source is `not yet`

Decided 20 November 2026 by the website builder, on the 🔍's block of PR #159. Updated the same day when #168 changed the `error.portal` eval.

## The rule

The telemetry contract says an unavailable source reads as unavailable, never as zero. So on every page, a figure that comes from
the metrics (`ortho.calls`) or the calls (the window's spans) is drawn only when its source was read. When it was not, the page says
`not yet` with the source's reason (a `not-yet` element, `data-hole="metrics"` or `"calls"`), carries no `data-*` attribute for the
figure, and never writes `0`:

- the reference page's refusal rows (`reference.tsx`): `not yet`, no `data-count`, no `data-span`;
- the operation page's Refusals list (`operation.tsx`): no `data-count` on a `refusal-code`, and a `not-yet` metrics element above it;
- the calls footer (`calls.tsx`): `data-shown`, `data-total` and `data-door-refusals` are each left off when unread;
- lit rows and arrows (`live.ts` `litOf`, `moveLit`): `data-lit="unknown"` when there is no source, so an unread window is never read as "no run".

A zero that remains is a count from a source that was read (the window held no call of that operation).

## History

Until #168 the `error.portal` eval required `data-count` to be a digit even with no source, so the operation page wrote
`data-count="0"` and `data-counted="false"` (recorded here on 20 November 2026). #168 made the eval accept a page that says its metrics
are unavailable (a `not-yet` element with `data-hole="metrics"`) and show no count, and judge the digit against the spans when there is
a source. The forced zero and `data-counted` are gone.

## Also recorded

The pages are plain elements with `data-portal` hooks, not the named `portal-ui` components `design/portal.md` (the component
inventory) maps every data shape to. See `design/later.md`, "The portal's pages on portal-ui components".
