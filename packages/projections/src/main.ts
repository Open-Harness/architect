// @orthograph/projections: the projections Orthograph ships, each one a plugin an app mounts in `blueprint/projections/`
// (`export default Blueprint.use(server, (p) => [])`). Parts one and two of M1.11 to M1.13: `model`, `api`, `server`, `sdk`, `cli`, `mcp` and `infra`; the docs
// and the portal follow, and arrive here too (M1-plugins section 15, X-10).
export { model } from "#modules/model/service.js";
export { api } from "#modules/api/service.js";
export { server } from "#modules/server/service.js";
export { sdk } from "#modules/sdk/service.js";
export { cli } from "#modules/cli/service.js";
export { mcp } from "#modules/mcp/service.js";
export { infra } from "#modules/infra/service.js";
