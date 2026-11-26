// Better Auth as Orthograph uses it: identity only (people, sessions, accounts, API keys), on D1, with Orthograph ids
// and every table under `auth_`, so no thing's table can collide with it. Organizations stay the project's own things.
import type { BetterAuthOptions } from "better-auth";
import { bearer, deviceAuthorization, jwt } from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key";
import { oauthProvider } from "@better-auth/oauth-provider";

const PREFIXES: Readonly<Record<string, string>> = { user: "per", session: "ses", account: "acc", verification: "ver", apikey: "key" };
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** 16 lowercase base36 characters, rejection-sampled so none is likelier than another. */
const suffix = (): string => {
  let out = "";
  while (out.length < 16) for (const b of crypto.getRandomValues(new Uint8Array(16))) if (b < 252 && out.length < 16) out += ALPHABET[b % 36];
  return out;
};

/** API keys start `ak_`, so a bearer credential says which kind it is. */
export const KEY_PREFIX = "ak_";

/**
 * The plugin's per-key limit is off, on purpose (#449). Left unset, `@better-auth/api-key` 1.7.15 refuses a key after 10
 * calls in 24 hours (`dist/index.mjs:2338-2339`), and `rateLimit: { enabled: false }` below does not reach it, so an
 * agent holding a key went anonymous on its 11th call. Nothing in design/ or docs/canon asks for a per-key limit, and a
 * counter kept in the key's row would write to D1 on every call. A limit on keys is the host's to set, as it is for every
 * other caller; a blueprint-declared one can come with that work, never as this silent default.
 */
export const NO_KEY_LIMIT = { enabled: false } as const;

/** The mark on a key made for an agent (`metadata.acts`): a call made with it is an agent's, acting for the key's person (M2-auth, fork 2). */
export const ACTS_FOR_AN_AGENT = "agent";

/** The device flow's polling interval; a client that polls faster is told `slow_down`. */
export const DEVICE_INTERVAL = "5s";

/** The one client the device flow answers to: the project's own CLI, `<project>-cli`. Any other id is refused. */
export const deviceClient = (cli: string) =>
  deviceAuthorization({
    verificationUri: "/device",
    interval: DEVICE_INTERVAL,
    validateClient: (clientId) => clientId === cli,
    schema: { deviceCode: { modelName: "auth_device_code" } },
  });

/** The scopes a client may ask for. A token says who the person is; what they may do is the operation's role check. */
export const SCOPES = ["openid", "profile", "email", "offline_access"] as const;

/** Where the remote MCP server is, given the server's own origin: the one resource an access token may name. */
export const mcpResource = (origin: string) => `${origin}/mcp`;

const t = (name: string) => ({ modelName: `auth_${name}` });

/**
 * OAuth 2.1 for the remote MCP server (D3 #122, the `mcp-oauth` spike): Better Auth's `oauthProvider` on the `jwt` plugin
 * (EdDSA, the key in `auth_jwks`). Clients register themselves (MCP clients do); `infer` makes a loopback redirect a native
 * client's, which the default `web` refuses. With an origin, the access token is a JWT whose audience is that origin's `/mcp`.
 */
const oauth = (origin: string | undefined) => [
  jwt({ schema: { jwks: t("jwks") } }),
  oauthProvider({
    loginPage: "/login",
    consentPage: "/consent",
    allowDynamicClientRegistration: true,
    allowUnauthenticatedClientRegistration: true,
    clientRegistrationDefaultApplicationType: "infer",
    scopes: [...SCOPES],
    clientRegistrationAllowedScopes: [...SCOPES],
    ...(origin === undefined ? {} : { resources: [mcpResource(origin)], clientRegistrationDefaultResources: [mcpResource(origin)] }),
    schema: {
      oauthClient: t("oauth_client"), oauthRefreshToken: t("oauth_refresh_token"), oauthAccessToken: t("oauth_access_token"),
      oauthConsent: t("oauth_consent"), oauthResource: t("oauth_resource"), oauthClientResource: t("oauth_client_resource"),
      oauthClientAssertion: t("oauth_client_assertion"),
    },
  }),
];

export const optionsFor = (cli: string, origin?: string) => ({
  emailAndPassword: { enabled: true },
  user: { modelName: "auth_user" },
  session: { modelName: "auth_session" },
  account: { modelName: "auth_account" },
  verification: { modelName: "auth_verification" },
  advanced: { database: { generateId: ({ model }: { model: string }) => `${PREFIXES[model] ?? model.slice(0, 3)}_${suffix()}` } },
  rateLimit: { enabled: false },
  // The jwt plugin's own /token would mint tokens that are not OAuth's; the provider's /oauth2/token is the one.
  disabledPaths: ["/token"],
  plugins: [bearer(), apiKey({ enableSessionForAPIKeys: true, enableMetadata: true, defaultPrefix: KEY_PREFIX, rateLimit: NO_KEY_LIMIT, schema: { apikey: { modelName: "auth_apikey" } } }), deviceClient(cli), ...oauth(origin)],
}) satisfies Omit<BetterAuthOptions, "database" | "secret">;
