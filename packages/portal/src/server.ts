// @orthograph/portal/server: the portal's server half, the only part of the portal a project's Worker imports (K19). The data API for
// `/_portal/v1/*` and the prebuilt client's static files at `/portal`. It reaches no React, no @orthograph/portal-ui and no HeroUI, and the
// lint rule `ortho/no-ui-in-worker` holds it to that.
export { PortalServer } from "#modules/server/service.js";
export type { PortalAssets, PortalContext, PortalEnv, PortalLedgerBinding } from "#modules/server/types.js";
export type { PortalLive } from "#modules/telemetry/types.js";
