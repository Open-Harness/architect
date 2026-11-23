# warm

A warm world (ST1.24, `design/research/speed-and-vitest-proposal.md` A1). `ortho dev` keeps the world and a collector
(writing `.ortho/dev-telemetry`, where `ortho telemetry trace` already looks) and, while it lives, `.ortho/dev.json`: its pid, the
world's URL, the collector's URL and folder, and when it began (`Warm.publish`, removed when dev stops).

`Warm.find(root)` is what `ortho prove --env local` asks first. It answers the record only when dev's process is alive, its
world answers `/_world/health`, and nothing under `src`, `blueprint` or `generated/server` is newer than dev's start: wrangler
reloads an edited handler on its own, but prove cannot tell when it has, so after an edit prove starts a world of its own until
dev is started again. A record whose process is gone (dev killed) is ignored.

`Warm.reset(record)` posts `/_world/reset` (host-cloudflare's `world` module): every table of the world's databases is emptied and
the cast is forgotten, so a run never sees the last one's records. This also empties what the developer made in `ortho dev`.
Not cleared: actor storage, and any bucket. Two proves at once against one dev would reset under each other.

Test: `warm.test.ts`. The end-to-end check is `e2e/m1/30-st1-24-warm-world.test.ts`.
