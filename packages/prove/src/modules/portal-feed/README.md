# portal-feed

`PortalFeed.serve({ source, metrics, environment, windowMs, now? })`: a scoped loopback server that answers `GET /` with a local world's
telemetry window, `{ environment, now, windowMs, traces, points }`, read from its collector (`TraceSource.window`) and `FileMetrics` at the
feed's clock (Effect's, or the injected `now`). `Worlds.start({ portalFeed })` gives the world its URL as `ORTHO_PORTAL_FEED`, and the
Worker's `PortalServer.serve` reads it for `/_portal/v1/snapshot` and `/_portal/v1/traces/<id>`, so a real run lights its own portal. The
Worker runs in workerd and cannot open the collector's files, which is why the process that started the world answers for them. The feed is loopback-only,
unauthenticated and prove-only: it carries raw spans, so it is never exposed beyond the machine, and the portal scrubs everything it takes (`@orthograph/portal`'s `Telemetry`); the feed is loopback only. `ortho prove` serves one for its world.
Not yet: `ortho dev` has no collector, and `ortho env up`'s detached environments would need a feed that outlives the command.
