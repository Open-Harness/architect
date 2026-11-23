# Saved claude.ai artifacts

Snapshots of claude.ai artifacts, read on 21 November 2026 so they survive a switch of Claude account. They are
snapshots only: the repository's design files (`design/`) stay the source of truth, and nothing here is updated
when the live artifacts change.

Whiteboards (marked W) keep their content in the artifact's database, not in the page. For those, the saved copy is
`<slug>.data.json` (the `board/meta` document and every `elements/*` document). The page itself is the same
shared Whiteboard runtime for all of them, saved once as `_whiteboard-shell.html` (its 4 MB `app.js`, 2 MB
`capture.js` and CSS were skipped, see below).

- Orthograph walkthrough (W), `walkthrough-board`, https://claude.ai/artifact/WYonnQAodEbvMffBx7QZYG, read 21 November 2026: the walkthrough board of Orthograph. Data: `walkthrough-board.data.json`.
- Blueprint canvas (W), `blueprint-canvas`, https://claude.ai/artifact/JnpCZ4C4af8pNYedTWGGJe, read 21 November 2026: a canvas laying out a blueprint. Data: `blueprint-canvas.data.json`.
- Orthograph Scope, `scope`, https://claude.ai/artifact/XoWHapW3eHk9VrMdtwZs7q, read 21 November 2026: what is built, partial, spiked or missing, with the K28 releases. Page: `scope.html`.
- Orthograph To-Dos, `todos`, https://claude.ai/artifact/3QRHJVp6wNontWUs7coFRo, read 21 November 2026: what needs Aaron, what threads are doing, done and parked, as of 20 November. Page: `todos.html`.
- App map grill (W), `app-map-grill`, https://claude.ai/artifact/8V9XikbuMFRpFXiMzmAMJW, read 21 November 2026: the app map grill board. Data: `app-map-grill.data.json`.
- UI on Orthograph (W), `ui-on-orthograph`, https://claude.ai/artifact/H13DfQTeCaBK2XLWe28hZk, read 21 November 2026: how UI sits on Orthograph. Data: `ui-on-orthograph.data.json`.
- Orthograph On Chain (W), `on-chain`, https://claude.ai/artifact/Awa6ahjAfYiLQXsUyXY9Ht, read 21 November 2026: the on-chain milestone board. Data: `on-chain.data.json`.
- Capxul Next on Orthograph (W), `capxul-next`, https://claude.ai/artifact/CFsgUxsQbienHAaEkYTcBw, read 21 November 2026: Capxul rebuilt on Orthograph. Data: `capxul-next.data.json`.
- Plugged In Walkthrough, `plugged-in-walkthrough`, https://claude.ai/artifact/FVQjGCEVzYj3ThNzYGdX75, read 21 November 2026: an editor-style walkthrough of building Plugged In from blueprint to generated files. Page: `plugged-in-walkthrough/index.html`, beside its scripts, CSS, `walkthrough.json` and `detail.html`, so it opens served from that folder.
- Orthograph Storyboard Canvas (W), `storyboard-canvas`, https://claude.ai/artifact/5HibrP24YgknKMeVzbDajT, read 21 November 2026: the storyboard board. Data: `storyboard-canvas.data.json`.
- Orthograph Map (W), `orthograph-map`, https://claude.ai/artifact/3EU4zQS1uQeSkbXZBxfGkL, read 21 November 2026: the map of Orthograph. Data: `orthograph-map.data.json`.
- Big map, `big-map`, https://claude.ai/artifact/8kTL5GEiQkJ7bfx1D61LsT, drawn 21 November 2026 at 11:00 UTC by the conductor: every goal and its thread, the integration branches and the branch cleanup, the capability map by area, what can be run and audited, the UI layer in the blueprint, and the handoff.

Skipped: the Whiteboard runtime files (`artifact-type/app.js` 4.2 MB, `app.css` 1.6 MB, `capture.js` 2.1 MB,
`capture.css` 0.4 MB, fonts), which belong to the artifact type and are not these artifacts' content. Comments on the
boards were not saved.
