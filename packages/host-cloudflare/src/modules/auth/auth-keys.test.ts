import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Auth, Principals } from "@orthograph/language-effect";
import { AuthD1 } from "./service.ts";

// Checks for the starter's sign-in snags #446 (an agent's key mints a person's key) and #449 (every key refused after ten calls a day).
// They state what must hold; the ones the code does not meet yet are listed in ../../../expected-failing/auth-keys.txt (G11).
// Real Better Auth on workerd and a real local D1, as auth.test.ts.
const instance = AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: true });
const provided = <A, E>(e: Effect.Effect<A, E, Auth | Principals>) => Effect.runPromise(e.pipe(Effect.provide(AuthD1.layer(instance))));
const principal = (authorization: string, door: "api" | "mcp") => provided(Effect.flatMap(Principals, (p) => p.of(authorization, door)));
const route = (path: string, headers: Record<string, string>, body: unknown = {}) =>
  Effect.runPromise(AuthD1.handle(instance, new Request(`http://ortho.local${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) })));
const keysOf = async (person: string) => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM "auth_apikey" WHERE "referenceId" = ?`).bind(person).first<{ n: number }>())!.n;

const someone = async (label: string) => {
  const email = `${label}.${crypto.randomUUID().slice(0, 8)}@example.test`;
  const { person } = await provided(Effect.flatMap(Auth, (a) => a.signUp({ email, password: "correct horse battery", name: label })));
  const { token } = await provided(Effect.flatMap(Auth, (a) => a.signIn({ email, password: "correct horse battery" })));
  const agent = (await Effect.runPromise(AuthD1.credential(instance, { kind: "agent", person }))).token;
  const plain = (await Effect.runPromise(AuthD1.credential(instance, { kind: "key", person }))).token;
  return { person, email, session: token, agent, plain };
};

describe("a key cannot mint, change or read a credential at Better Auth's routes (#446)", () => {
  const ways = (key: string): ReadonlyArray<readonly [string, Record<string, string>]> => [["x-api-key", { "x-api-key": key }], ["bearer", { authorization: `Bearer ${key}` }]];
  const ROUTES = ["/api/auth/api-key/create", "/api/auth/api-key/update", "/api/auth/api-key/delete", "/api/auth/api-key/list", "/api/auth/get-session", "/api/auth/device/approve", "/api/auth/sign-out"];

  it("an agent's real key, and a person's, are refused 401 at every route by header and by bearer, and no key row is added", { timeout: 60_000 }, async () => {
    const s = await someone("minter");
    const before = await keysOf(s.person);
    for (const [kind, key] of [["agent", s.agent], ["person", s.plain]] as const) {
      for (const path of ROUTES) {
        for (const [how, headers] of ways(key)) {
          const res = await route(path, headers, { name: "escalated" });
          const text = await res.text();
          expect([res.status, /ak_[0-9A-Za-z]/.test(text)], `${kind} key, ${how}, ${path}: ${text.slice(0, 120)}`).toEqual([401, false]);
        }
      }
    }
    expect(await keysOf(s.person), "no key was minted").toBe(before);
  });

  it("whatever key is sent is refused the same way whether or not it is a real one: the refusal never says which keys exist", { timeout: 30_000 }, async () => {
    const s = await someone("blind");
    const seen = new Set<string>();
    for (const key of [s.agent, s.plain, "ak_does-not-exist"]) for (const [, headers] of ways(key)) {
      const res = await route("/api/auth/api-key/create", headers, { name: "x" });
      seen.add(`${res.status} ${await res.text()}`);
    }
    expect(seen.size, [...seen].join(" | ")).toBe(1);
  });

  it("control: the person's own session still mints a key at the route, and that key is a person by key, no agent's", { timeout: 30_000 }, async () => {
    const s = await someone("owner");
    const res = await route("/api/auth/api-key/create", { authorization: `Bearer ${s.session}` }, { name: "mine" });
    const made = (await res.json()) as { key?: string };
    expect(res.status).toBe(200);
    expect(made.key?.startsWith("ak_")).toBe(true);
    expect(await principal(`Bearer ${made.key}`, "api")).toEqual({ kind: "person", person: s.person, email: s.email, via: "key" });
  });
});

describe("a key is not refused after ten calls a day (#449)", () => {
  // The count is the point: the plugin's own default is 10 requests in 24 hours, per key. 40 is well past it, through both doors.
  const CALLS = 40;
  const door = (i: number) => (i % 2 === 0 ? "api" : "mcp") as "api" | "mcp";
  const same = (n: number, what: string) => Array.from({ length: n }, () => what);
  // "agent x10, anonymous x30": the run lengths, so a failure reads in one line.
  const runs = (seen: ReadonlyArray<string>) => seen.reduce<Array<[string, number]>>((out, k) => (out.at(-1)?.[0] === k ? (out.at(-1)![1]++, out) : [...out, [k, 1]]), []).map(([k, n]) => `${k} x${n}`).join(", ");
  const judge = (seen: ReadonlyArray<string>, expected: ReadonlyArray<string>) => expect(runs(seen)).toBe(runs(expected));

  it("an agent's key is an agent on every one of 40 calls, through the API door and the MCP door, one at a time", { timeout: 120_000 }, async () => {
    const s = await someone("steady");
    const seen: Array<string> = [];
    for (let i = 0; i < CALLS; i++) seen.push((await principal(`Bearer ${s.agent}`, door(i))).kind);
    judge(seen, same(CALLS, "agent"));
  });

  it("a person's key is a person by key on every one of 40 calls at the API door, and an agent at the MCP door", { timeout: 120_000 }, async () => {
    const s = await someone("plainkey");
    const seen: Array<string> = [];
    for (let i = 0; i < CALLS; i++) {
      const p = await principal(`Bearer ${s.plain}`, door(i));
      seen.push(p.kind === "person" ? `person/${p.via}` : p.kind);
    }
    judge(seen, Array.from({ length: CALLS }, (_, i) => (door(i) === "api" ? "person/key" : "agent")));
  });

  it("a burst of 40 at once is every one an agent", { timeout: 120_000 }, async () => {
    const s = await someone("burst");
    const seen = (await Promise.all(Array.from({ length: CALLS }, (_, i) => principal(`Bearer ${s.agent}`, door(i))))).map((p) => p.kind);
    judge(seen, same(CALLS, "agent"));
  });

  it("one key spending its calls does not refuse another person's keys", { timeout: 120_000 }, async () => {
    const [a, b] = [await someone("spender"), await someone("neighbour")];
    for (let i = 0; i < CALLS; i++) await principal(`Bearer ${a.agent}`, "api");
    expect((await principal(`Bearer ${b.agent}`, "api")).kind).toBe("agent");
    expect((await principal(`Bearer ${b.plain}`, "api")).kind).toBe("person");
  });
});
