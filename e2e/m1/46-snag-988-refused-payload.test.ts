// Check 46 (#988): the API's answer to a payload its schema refuses. Acme runs in a local world (workerd, no cloud), and each
// call goes to its generated server over HTTP, as an integration that posts to the API does (not through the SDK, which
// refuses before it sends).
//
// The contract, the SDK's own (`generated/sdk/src/client.ts`: "a payload its schema refuses: the message names where and
// why, never the value") at the API door: a refused payload is a 400 whose body is JSON, `{ _tag: "InvalidPayload",
// message }`, the runtime's name for it (`InvalidPayload`, D3, G3), its text under `message` as the SDK's class keeps it
// (the runtime's own class says `issues`; the wire takes the SDK's word, so a client reads one shape on both sides). The message names each refused field, and only those,
// and says why (a field left out is "missing"); it never holds a value the caller sent, a secret's least of all. The
// handler never runs. Every refused field is named, two at once included: stricter than the SDK today, which reports only
// the first (Effect's default), but what #988 asks. Red on main: the 400's body is empty for every refused payload.
//
// The controls stay green: a payload that fits is answered, a declared refusal keeps its own status and body, and every
// refused payload is a 400 (the status is already right; only the body is missing).
//
// Either form passes: the SDK's own clauses (`cap is not the right kind of value; name is missing`) or Effect's own message,
// which the CLI's `SchemaError` line prints (`Missing key\n  at ["name"]`). Not judged: the words beyond "missing", or their order; a field nested inside a value (acme's payloads
// are flat); what the CLI or MCP print (the CLI's `SchemaError` line and MCP's `InvalidPayload: …` already name fields).
import { Effect, Exit, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startWorld, type Called, type Seen } from "./request-key-world.ts";
import { acme, copyOf, nothingRunning, succeeds } from "./support.ts";

let copy: ReturnType<typeof copyOf>;
let seen: Seen;
let ada: { readonly person: string; readonly token: string };
const scope = Effect.runSync(Scope.make());
beforeAll(async () => {
  copy = copyOf(acme);
  succeeds(copy.root, "generate");
  seen = await startWorld(copy.root, "s988", scope);
  ada = (await seen.cast("ada"))["ada"]!;
}, 300_000);
afterAll(async () => { await Effect.runPromise(Scope.close(scope, Exit.void)); if (copy) { nothingRunning(copy.root); copy.remove(); } });

// A secret no answer may hold, not even four characters of it in any case: acme's `Password` is
// `visibility.secret(text({ max: 128 }))`, so 129 characters are refused. Made of no word, so no honest message holds a piece of it.
const SECRET = "q7Zk9Xw2".repeat(17).slice(0, 129);
/** Every four characters of a value, lower-cased: an answer holding any of them holds part of it. */
const windows = (value: string) => Array.from({ length: value.length - 3 }, (_, i) => value.slice(i, i + 4).toLowerCase());
const FITS = "s988-fits-a-password";
const EMAIL = "s988.ada@example.com";

/** A refused payload: the route, the body sent, the fields the message must name, the values it must not hold, and any field it must say is missing. */
interface Refused { readonly why: string; readonly route: string; readonly token?: boolean; readonly type?: string; readonly body: Record<string, unknown>; readonly names: ReadonlyArray<string>; readonly not: ReadonlyArray<string>; readonly hides: ReadonlyArray<string>; readonly missing?: string }
const REFUSED: ReadonlyArray<Refused> = [
  { why: "a uint written as a fraction", route: "organization/create", token: true, body: { name: "s988 org", cap: "15.729" }, names: ["cap"], not: ["name"], hides: ["15.729", "s988 org"] },
  { why: "a negative uint", route: "organization/create", token: true, body: { name: "s988 org", cap: "-4096" }, names: ["cap"], not: ["name"], hides: ["-4096", "s988 org"] },
  { why: "a uint given as a JSON number, not its text", route: "organization/create", token: true, body: { name: "s988 org", cap: 4096 }, names: ["cap"], not: ["name"], hides: ["4096"] },
  { why: "an empty text", route: "organization/create", token: true, body: { name: "", cap: "1000" }, names: ["name"], not: ["cap"], hides: ["1000"] },
  { why: "a field left out", route: "organization/create", token: true, body: { cap: "7331" }, names: ["name"], not: ["cap"], hides: ["7331"], missing: "name" },
  { why: "two fields wrong at once", route: "organization/create", token: true, body: { name: "", cap: "15.729" }, names: ["name", "cap"], not: [], hides: ["15.729"] },
  { why: "a malformed id", route: "allowance/spend", token: true, body: { allowance: "s988-no-such-shape", amount: "10", memo: "s988 memo" }, names: ["allowance"], not: ["amount", "memo"], hides: ["s988-no-such-shape", "s988 memo"] },
  { why: "an address that is not an email", route: "invitation/send", token: true, body: { organization: "org_s988", email: "s988-not-an-email" }, names: ["email"], not: ["organization"], hides: ["s988-not-an-email", "org_s988"] },
  { why: "a secret over its length", route: "person/sign-up", body: { email: EMAIL, password: SECRET, name: "s988 Ada" }, names: ["password"], not: ["email", "name"], hides: [...windows(SECRET), EMAIL, "s988 Ada"] },
  { why: "a bad email beside a secret that fits", route: "person/sign-up", body: { email: "s988-not-an-email", password: FITS, name: "s988 Ada" }, names: ["email"], not: ["password", "name"], hides: [FITS, "s988-not-an-email"] },
  // Not only operations: a read's payload is refused the same way.
  { why: "a read's malformed id", route: "organization/get", token: true, body: { id: "s988-bad-id" }, names: ["id"], not: [], hides: ["s988-bad-id"] },
  // Whoever asks: a caller with no token is refused the payload first, as one with a token is.
  { why: "a uint written as a fraction, with no token", route: "organization/create", body: { name: "s988 org", cap: "15.729" }, names: ["cap"], not: ["name"], hides: ["15.729", "s988 org"] },
  // JSON with its charset named is still JSON.
  { why: "a uint written as a fraction, sent as JSON with its charset", route: "organization/create", token: true, type: "application/json; charset=utf-8", body: { name: "s988 org", cap: "15.729" }, names: ["cap"], not: ["name"], hides: ["15.729", "s988 org"] },
];

const call = (r: { readonly route: string; readonly token?: boolean; readonly type?: string; readonly body: object }) => seen.call(r.route, r.token ? ada.token : undefined, r.body, undefined, r.type);
/** The answer as a caller sees it: its headers and its body, less the trace id this check sent (`x-trace-id` echoes it, and a random hex id can hold a digit value judged below). */
const seenText = (c: Called) => `${JSON.stringify(c.headers)}\n${c.text}`.toLowerCase().replaceAll(c.trace, "");
/** The body as JSON, or why it is not: the check reads the raw text, never a body the world's helper guessed at. */
const json = (c: Called): Record<string, unknown> | string => { try { const v = JSON.parse(c.text) as unknown; return typeof v === "object" && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : `not an object: ${c.text}`; } catch { return `not JSON: ${JSON.stringify(c.text)}`; } };
/** A field named in the message as a word: `cap` in "cap is …", never inside another word. */
const named = (message: string, field: string) => new RegExp(`(^|[^A-Za-z0-9_])${field}([^A-Za-z0-9_]|$)`).test(message);

describe("46 #988: a payload the API refuses is a 400 that names each field and why, never the value", () => {
  for (const r of REFUSED) {
    it(`${r.why} (${r.route}): 400, { _tag: "InvalidPayload", message } naming ${r.names.join(" and ")}${r.missing ? " as missing" : ""}`, async () => {
      const c = await call(r);
      expect(c.status, c.text).toBe(400);
      const body = json(c);
      expect(typeof body === "string" ? body : body["_tag"], "the body is JSON, tagged as the runtime's refusal").toBe("InvalidPayload");
      expect(typeof body === "string" ? [] : Object.keys(body).sort(), "the body is { _tag, message } and nothing else: no cause, no schema").toEqual(["_tag", "message"]);
      const message = typeof body === "string" ? "" : body["message"];
      expect(typeof message, "a message").toBe("string");
      const text = message as string;
      for (const field of r.names) expect(named(text, field), `the message names ${field}: ${text}`).toBe(true);
      for (const field of r.not) expect(named(text, field), `the message names only refused fields, not ${field}: ${text}`).toBe(false);
      if (r.missing !== undefined) expect(text, "a field left out is said to be missing").toMatch(/\bmissing\b/i);
      else expect(text, "nothing was left out").not.toMatch(/\bmissing\b/i);
      for (const value of r.hides) expect(seenText(c).includes(value.toLowerCase()), `neither the body nor a header holds a sent value, in any case (${value.slice(0, 20)}…)`).toBe(false);
    });
  }

  it("a body holding neither declared field: 400, both named as missing, and the stray value never shown", async () => {
    const c = await seen.call("organization/create", ada.token, { raw: "s988-raw" });
    expect(c.status, c.text).toBe(400);
    const body = json(c);
    expect(typeof body === "string" ? body : body["_tag"]).toBe("InvalidPayload");
    const text = typeof body === "string" ? "" : String(body["message"]);
    for (const field of ["name", "cap"]) expect(named(text, field), `the message names ${field}: ${text}`).toBe(true);
    expect(text, "and says they are missing").toMatch(/\bmissing\b/i);
    expect(seenText(c).includes("s988-raw"), "the answer never holds a sent value").toBe(false);
  });

  it("a body that is JSON but not an object (a list): 400, { _tag: \"InvalidPayload\", message } saying something", async () => {
    const c = await call({ route: "organization/create", token: true, body: ["s988-listed"] });
    expect(c.status, c.text).toBe(400);
    const body = json(c);
    expect(typeof body === "string" ? body : [body["_tag"], Object.keys(body).sort()]).toEqual(["InvalidPayload", ["_tag", "message"]]);
    expect(typeof body === "string" ? "" : String(body["message"]), "the message says something").not.toBe("");
    expect(seenText(c).includes("s988-listed"), "the answer never holds a sent value").toBe(false);
  });
});

describe("46 #988: the controls", () => {
  it("a payload that fits, with a key it does not declare, is answered: an extra key is not refused", async () => {
    const c = await seen.call("organization/create", ada.token, { name: "s988 extra", cap: "1000", note: "s988-note" });
    expect(c.status, c.text).toBe(200);
  });

  it("a payload that fits is answered", async () => {
    const c = await seen.call("organization/create", ada.token, { name: "s988 fits", cap: "1000" });
    expect(c.status, c.text).toBe(200);
    expect(typeof c.body["organization"], c.text).toBe("string");
  });

  it("a declared refusal keeps its own status and body: no caller is NotAllowed, 403, with its code", async () => {
    const c = await seen.call("organization/create", undefined, { name: "s988 nobody", cap: "1000" });
    expect([c.status, json(c)], c.text).toEqual([403, { _tag: "NotAllowed", code: "AR-001" }]);
  });

  it("every refused payload is a 400, already (the status is not what #988 changes)", async () => {
    for (const r of REFUSED) expect((await call(r)).status, r.why).toBe(400);
  });

  it("a refused sign-up made no account: the same email signs up once its payload fits", async () => {
    const refused = REFUSED.find((r) => r.route === "person/sign-up" && r.body["password"] === SECRET)!;
    expect((await call(refused)).status).toBe(400);
    const c = await seen.call("person/sign-up", undefined, { email: EMAIL, password: FITS, name: "s988 Ada" });
    expect(c.status, c.text).toBe(200);
  });
});
