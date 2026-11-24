// #981, item 2: a decimal with more places than its field declares is refused at each door, never rounded and never sent
// as it is. `Blueprint.decimal({ places: 2 })` given `1.234`: the SDK refuses to send the call, naming the field; the API
// refuses the payload with a 400 before its handler runs; and an answer holding one is never written. Exactly the declared
// places, and fewer, are the controls. The CLI's door is in `cli/decimal-doors.test.ts`. Written by #981's checks author;
// green on main when written, so it is a guard: it fails on a build that rounds, pads or sends such a decimal.
//
// The endpoint and the client are built in process as `renderApi` and the SDK build them (`decimal-wire.test.ts`,
// assumption 1, says how), so this file reads no generated project.
//
// Not judged here: the words of the API's 400. Its body is empty for every payload it refuses, a decimal or not (#981
// records it); naming the field there would change the API for every value, so it is not this check's.
// Not judged here either: whether a decimal made in code whose extra places are zeros (`1.230`, as `1.23 × 1.0` makes it)
// has more places than its field holds. Every decimal below is made from text spelling its places exactly; the text
// `1.230` itself is refused at the API, being written with three. Exactly the declared places, and fewer, keep their
// digits and places through each door (`1.50` stays `1.50`).
import { BigDecimal, Context, Effect, Exit, Layer } from "effect";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import { HttpApi, HttpApiBuilder, HttpApiClient, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import { Blueprint } from "orthograph";
import { wireStruct } from "orthograph/server";
import { describe, expect, it } from "vitest";

const Rate = Blueprint.thing({ description: "An exchange rate.", fields: { id: Blueprint.id("rt"), amount: Blueprint.decimal({ places: 2 }) } });
const quote = Blueprint.operation(Rate, {
  description: "Quote a rate.",
  payload: { amount: Rate.fields.amount },
  answer: { amount: Rate.fields.amount, tip: Blueprint.decimal({ places: 2 }) },
  allowed: [Blueprint.anyone],
});

const Api = HttpApi.make("places").add(HttpApiGroup.make("rate").add(
  HttpApiEndpoint.post("quote", "/rate/quote", {
    payload: quote.payloadSchema,
    success: wireStruct(quote.answer, { issuing: true }) as unknown as typeof quote.answerSchema,
  }),
));
// The tip the handler answers for each value it is given: the ones marked over have three places, one more than `tip` holds.
const TIPS: Readonly<Record<string, string>> = { "1.23": "0.12", "1.2": "0.1", "1": "0", "4.56": "0.456", "7.8": "0.781", "9": "9.999" };
const OVER = ["4.56", "7.8", "9"];
let handled = 0;
const group = HttpApiBuilder.group(Api, "rate", (handlers) =>
  handlers.handle("quote", ({ payload }) => Effect.sync(() => {
    handled++;
    const amount = (payload as { readonly amount: BigDecimal.BigDecimal }).amount;
    const text = BigDecimal.format(amount);
    return { amount, tip: BigDecimal.fromStringUnsafe(TIPS[text] ?? "0") } as never;
  })));
const served = HttpApiBuilder.layer(Api).pipe(Layer.provide(group), Layer.provide(HttpServer.layerServices));

const URL = "http://example.local";
/** The server in process, the requests that reached it, its raw responses, and a client that reaches it through `fetch`, as the SDK's does. */
const withServer = <A>(body: (raw: (json: string) => Promise<Response>, client: HttpApiClient.ForApi<typeof Api>, sent: ReadonlyArray<string>) => Effect.Effect<A, unknown>) =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const web = yield* Effect.acquireRelease(Effect.sync(() => HttpRouter.toWebHandler(served)), (app) => Effect.promise(app.dispose));
    const sent: Array<string> = [];
    const fetch = ((...[input, init]: Parameters<typeof globalThis.fetch>) => {
      sent.push(String(init?.body ?? ""));
      return web.handler(new Request(input, init), Context.empty());
    }) as typeof globalThis.fetch;
    const raw = (json: string) => fetch(`${URL}/rate/quote`, { method: "POST", headers: { "content-type": "application/json" }, body: json });
    const client = yield* HttpApiClient.make(Api, { baseUrl: URL }).pipe(Effect.provide(FetchHttpClient.layer), Effect.provideService(FetchHttpClient.Fetch, fetch));
    return yield* body(raw, client, sent);
  })) as Effect.Effect<A, never>);

const d = (text: string) => BigDecimal.fromStringUnsafe(text);
/** Each decimal's places as written, so `1.234` has three. */
const OVER_PLACES = ["1.234", "0.001", "-12.345", "100.000001"];
// Text the API takes in: written with more places than the field holds, or with an exponent that makes them.
const OVER_TEXT = [...OVER_PLACES, "1.230", "1.2e-5", "1e-3"];
const WITHIN = ["1.23", "1.2", "1", "-0.5", "0", "1.50", "1.00", "0.10", "0.00", "0.0", "90071992547409.90"];
/** A decimal as its digits and places: 1.50 is 150 at 2 places, never 15 at 1. */
const digits = (n: BigDecimal.BigDecimal) => [String(n.value), n.scale];

describe("The SDK refuses to send a decimal with more places than its field holds", () => {
  for (const text of OVER_PLACES) {
    it(`refuses ${text} for a field of 2 places before sending, naming the field`, () =>
      withServer((_, client, sent) => Effect.gen(function* () {
        const exit = yield* Effect.exit(client.rate.quote({ payload: { amount: d(text) } as never }));
        expect(Exit.isFailure(exit), "the call fails").toBe(true);
        expect(String(Exit.isFailure(exit) ? exit.cause : ""), "the failure names the field").toMatch(/\bamount\b/);
        expect(sent, "nothing was sent: no rounded or longer text went out").toEqual([]);
      })));
  }

  it("sends a decimal held with a negative scale (1500 as 15 hundreds) as its plain digits", () =>
    withServer((_, client, sent) => Effect.gen(function* () {
      const hundreds = BigDecimal.make(15n, -2);
      const answer = (yield* client.rate.quote({ payload: { amount: hundreds } as never })) as { readonly amount: BigDecimal.BigDecimal };
      expect(sent.map((b) => JSON.parse(b) as unknown)).toEqual([{ amount: "1500" }]);
      expect(BigDecimal.equals(answer.amount, hundreds)).toBe(true);
    })));

  it("sends exactly the declared places, and fewer, as written (the control)", () =>
    withServer((_, client, sent) => Effect.gen(function* () {
      for (const text of WITHIN) {
        const answer = (yield* client.rate.quote({ payload: { amount: d(text) } as never })) as { readonly amount: BigDecimal.BigDecimal };
        expect(digits(answer.amount), text).toEqual(digits(d(text)));
      }
      expect(sent.map((b) => JSON.parse(b) as unknown)).toEqual(WITHIN.map((amount) => ({ amount })));
    })));
});

describe("The API refuses a payload with more places than its field holds, before the handler runs", () => {
  for (const text of OVER_TEXT) {
    it(`refuses ${JSON.stringify(text)} with a 400`, () =>
      withServer((raw) => Effect.promise(async () => {
        const before = handled;
        const response = await raw(JSON.stringify({ amount: text }));
        expect(response.status).toBe(400);
        expect(handled, "the handler never ran").toBe(before);
      })));
  }

  it("takes exactly the declared places, and fewer (the control)", () =>
    withServer((raw) => Effect.promise(async () => {
      for (const text of WITHIN) {
        const response = await raw(JSON.stringify({ amount: text }));
        expect(response.status, text).toBe(200);
        expect(((await response.json()) as { readonly amount: unknown }).amount, text).toBe(text);
      }
    })));
});

describe("The API never writes an answer holding a decimal with more places than its field holds", () => {
  for (const value of OVER) {
    it(`a handler's tip of ${TIPS[value]} for a field of 2 places is not answered, rounded or as it is`, () =>
      withServer((raw) => Effect.promise(async () => {
        const response = await raw(JSON.stringify({ amount: value }));
        const body = await response.text();
        expect(response.status, body).not.toBe(200);
        const tip = TIPS[value]!;
        // the tip as it is, and every way of cutting it to two places
        for (const shown of [tip, BigDecimal.format(BigDecimal.round(d(tip), { scale: 2, mode: "half-from-zero" })), BigDecimal.format(BigDecimal.round(d(tip), { scale: 2, mode: "to-zero" })), BigDecimal.format(BigDecimal.round(d(tip), { scale: 2, mode: "from-zero" }))]) {
          expect(body, `the answer holds no ${shown}`).not.toContain(`"${shown}"`);
        }
      })));
  }

  it("answers a tip of exactly the declared places, and fewer (the control)", () =>
    withServer((raw) => Effect.promise(async () => {
      for (const value of ["1.23", "1.2", "1"]) {
        const response = await raw(JSON.stringify({ amount: value }));
        expect(response.status, value).toBe(200);
        expect(((await response.json()) as { readonly tip: unknown }).tip, value).toBe(TIPS[value]);
      }
    })));
});
