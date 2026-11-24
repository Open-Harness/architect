import { Auth, Blueprint } from "orthograph";

export default Blueprint.config({
  name: "superagent",
  auth: Auth.betterAuth({ apiKeys: true, deviceLogin: true, oauthProvider: true }), // people sign in; agents sign in to the MCP server
});
