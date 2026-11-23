import { createSign, generateKeyPairSync } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Cause, Effect, Exit, Scope } from "effect";
import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { Owned } from "#modules/owned/service.js";
import { Issuer } from "./service.ts";
import type { IssuerConfig } from "./types.ts";

const config: IssuerConfig = {
  tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600, requestMappings: [
    { requestParam: "client_id", match: "ci-main", claims: { sub: "repo:acme/acme:ref:refs/heads/main", aud: ["ortho-logbook"], repository: "acme/acme", ref: "refs/heads/main", workflow: "ortho" } },
    { requestParam: "client_id", match: "ci-pr", claims: { sub: "repo:acme/acme:ref:refs/pull/7/merge", aud: ["ortho-logbook"], repository: "acme/acme", ref: "refs/pull/7/merge", workflow: "ortho" } },
  ] }],
};

const mint = (issuer: string, client: string) =>
  fetch(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }) })
    .then((r) => r.json() as Promise<{ access_token: string; expires_in: number }>);
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

describe("the OIDC issuer", () => {
  it("is a process that mints a token per scenario a verifier accepts through discovery, and is gone with its scope", { timeout: 30_000 }, async () => {
    const scope = Effect.runSync(Scope.make());
    const issuer = await Effect.runPromise(Issuer.start({ config }).pipe(Scope.provide(scope)));
    try {
      expect(issuer.url).toBe(`http://127.0.0.1:${issuer.port}/ortho`);
      expect(alive(issuer.pid)).toBe(true);

      const discovery = await fetch(`${issuer.url}/.well-known/openid-configuration`).then((r) => r.json() as Promise<{ issuer: string; jwks_uri: string; token_endpoint: string }>);
      expect(discovery).toMatchObject({ issuer: issuer.url, token_endpoint: `${issuer.url}/token` });

      const { access_token: token, expires_in } = await mint(issuer.url, "ci-main");
      expect(expires_in).toBe(600);
      const verified = await jwtVerify(token, createRemoteJWKSet(new URL(discovery.jwks_uri)), {
        issuer: issuer.url, audience: "ortho-logbook", algorithms: ["RS256"], requiredClaims: ["exp", "iat", "repository", "ref", "workflow"],
      });
      expect(verified.payload).toMatchObject({ repository: "acme/acme", ref: "refs/heads/main", workflow: "ortho", sub: "repo:acme/acme:ref:refs/heads/main" });
      expect((verified.payload.exp ?? 0) - (verified.payload.iat ?? 0)).toBe(600);
      expect(decodeProtectedHeader(token)).toMatchObject({ alg: "RS256", typ: "JWT" });

      // It never holds a connection open: a client whose event loop is blocked for a while (a test running a command) must not find
      // its pooled socket reset when it asks again.
      expect((await fetch(`${issuer.url}/jwks`)).headers.get("connection")).toBe("close");

      // A scenario is a client id: the other one's claims are its own.
      expect(decodeJwt((await mint(issuer.url, "ci-pr")).access_token)).toMatchObject({ ref: "refs/pull/7/merge" });
      // An unknown client still gets a token, with no scenario's claims.
      expect(decodeJwt((await mint(issuer.url, "someone")).access_token)).toMatchObject({ sub: "someone", aud: ["someone"] });
    } finally { await Effect.runPromise(Scope.close(scope, Exit.void)); }
    expect(alive(issuer.pid)).toBe(false);
  });

  it("signs with a key of its own: a forged signature, and another issuer's token, do not verify", { timeout: 30_000 }, async () => {
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const [trusted, rogue] = [yield* Issuer.start({ config }), yield* Issuer.start({ config })];
      const token = (yield* Effect.promise(() => mint(trusted.url, "ci-main"))).access_token;
      const [header, payload] = token.split(".");
      const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
      const forged = `${header}.${payload}.${createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKey).toString("base64url")}`;
      const keys = createRemoteJWKSet(new URL(`${trusted.url}/jwks`));
      yield* Effect.promise(() => expect(jwtVerify(forged, keys, { issuer: trusted.url })).rejects.toBeDefined());
      const other = (yield* Effect.promise(() => mint(rogue.url, "ci-main"))).access_token;
      yield* Effect.promise(() => expect(jwtVerify(other, keys, { issuer: trusted.url })).rejects.toBeDefined());
      expect(trusted.port).not.toBe(rogue.port);
    })));
  });

  // A port picked as free can be taken before the issuer listens on it (CI runs many suites at once). The issuer then exits and
  // says why, so a port the caller gave fails with that reason, and a port the issuer picked itself is picked again.
  it("on a port already taken it exits and says why, instead of waiting or dying silently", { timeout: 30_000 }, async () => {
    const held = createServer((_request, response) => { response.writeHead(404); response.end(); });
    await new Promise<void>((done) => held.listen(0, "127.0.0.1", () => done()));
    try {
      const exit = await Effect.runPromiseExit(Effect.scoped(Issuer.start({ config, port: (held.address() as AddressInfo).port })));
      expect(Exit.isFailure(exit)).toBe(true);
      const error = Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined;
      expect(error).toMatchObject({ _tag: "ProcessFailed", exited: true });
      expect(String((error as { message?: unknown }).message)).toMatch(/exited before it answered: issuer: couldn't listen on 127\.0\.0\.1:\d+/);
    } finally { held.close(); }
  });

  it("when the port it got was taken before it listened, it gets another and starts there", { timeout: 30_000 }, async () => {
    const held = createServer((_request, response) => { response.writeHead(404); response.end(); });
    await new Promise<void>((done) => held.listen(0, "127.0.0.1", () => done()));
    const taken = (held.address() as AddressInfo).port;
    let asked = 0;
    // The first port it is handed is the held one, as when another process takes a picked port first; then a free one.
    const ports = Effect.suspend(() => (asked++ === 0 ? Effect.succeed(taken) : Owned.freePort));
    try {
      await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        const issuer = yield* Issuer.start({ config, ports });
        expect(asked).toBe(2);
        expect(issuer.port).not.toBe(taken);
        expect((yield* Effect.promise(() => fetch(`${issuer.url}/.well-known/openid-configuration`))).ok).toBe(true);
      })));
    } finally { held.close(); }
  });
});
