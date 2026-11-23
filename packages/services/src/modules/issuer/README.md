# issuer

`Issuer.start({ config?, port?, dir? })`: an OIDC issuer of our own over `jose`, as a process of the caller's scope (K10
section 8, M1.33). It stands in for GitHub's token issuer exactly as `ghcr.io/navikt/mock-oauth2-server` did, and reads the
same scenario file (the part of its config the gates used): `tokenCallbacks: [{ issuerId, tokenExpiry, requestMappings:
[{ requestParam, match, claims }] }]`. A scenario is a client id; a client-credentials request for it gets a token with
those claims. With no mapping the token carries `sub` and `aud` of the client id.

- `GET /<issuerId>/.well-known/openid-configuration`: `issuer`, `jwks_uri`, `token_endpoint` (the origin is the request's
  `Host`, so `iss` is the address the caller used).
- `GET /<issuerId>/jwks`: the public key. One RSA key per process, made when it starts: a second issuer, or a forger,
  never verifies against it.
- `POST /<issuerId>/token`: `grant_type=client_credentials` and the scenario's `client_id`; an RS256 token with `iss`, `iat`,
  `nbf`, `exp`, `jti` and the scenario's claims; no check of the secret, as GitHub's job tokens have none.

It runs as `node src/main.ts issuer --port <n> --config <file>` (the module's `serve` is what that runs), so it is a
process with its own PID: started with the scope, owned by PID, stopped with the scope, and found by `Owned.leaks` if a
run ends with it still up. Test: `issuer.test.ts`.
