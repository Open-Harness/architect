import { Auth, Blueprint } from "orthograph";

export default Blueprint.config({
  name: "acme",
  auth: Auth.betterAuth({ organizations: true, apiKeys: true, deviceLogin: true, oauthProvider: true }), // agents sign in to the MCP server
});
