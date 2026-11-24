// Exact decimals through the generated API and SDK (#742, item 5, after #943 and #959): Capxul's books and payroll send
// rates, quantities and percentages through the SDK. A decimal must reach the server and come back exactly: `"1.50"`
// stays `1.50`, a 17-digit value gets no exponent, and text that is no decimal is refused before it is handled.
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. An operation's endpoint is built as `renderApi` writes it (`api/internal/api.ts`): `payload: declaration.payloadSchema`
//     and `success: wireStruct(declaration.answer, { issuing: true })`, and the SDK calls it through `HttpApiClient`
//     (`sdk/internal/client.ts`). This file builds the same endpoint and client in process, so it reads no generated
//     project and stays clear of the files #887 changes (`api.ts`, `sdk.ts`, `sdk/internal/types.ts`).
//  2. On the wire a decimal is the text the field's schema encodes (`decimalText`), in both directions.
//  3. A payload whose decimal is not plain decimal text, or has more places than the field holds, is refused with a 400
//     before the handler runs.
import { BigDecimal, Context, Effect, Layer, Schema } from "effect";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import { HttpApi, HttpApiBuilder, HttpApiClient, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import { Blueprint } from "orthograph";
import { wireStruct } from "orthograph/server";
import { describe, expect, it } from "vitest";

const Rate = Blueprint.thing({ description: "An exchange rate.", fields: { id: Blueprint.id("rt"), value: Blueprint.decimal({ places: 20 }) } });
const quote = Blueprint.operation(Rate, {
  description: "Quote a rate.",
  payload: { value: Rate.fields.value },
  answer: { value: Rate.fields.value, doubled: Blueprint.decimal({ places: 20 }) },
  allowed: [Blueprint.anyone],
});

const Api = HttpApi.make("decimals").add(HttpApiGroup.make("rate").add(
  HttpApiEndpoint.post("quote", "/rate/quote", {
    payload: quote.payloadSchema,
    success: wireStruct(quote.answer, { issuing: true }) as unknown as typeof quote.answerSchema,
  }),
));
let handled = 0;
const group = HttpApiBuilder.group(Api, "rate", (handlers) =>
  handlers.handle("quote", ({ payload }) => Effect.sync(() => {
    handled++;
    const value = (payload as { readonly value: BigDecimal.BigDecimal }).value;
    return { value, doubled: BigDecimal.multiply(value, BigDecimal.fromStringUnsafe("2")) } as never;
  })));
const served = HttpApiBuilder.layer(Api).pipe(Layer.provide(group), Layer.provide(HttpServer.layerServices));

const URL = "http://example.local";
/** The server in process, its raw responses, and a client that reaches it through `fetch`, as the SDK's does. */
const withServer = <A>(body: (raw: (json: string) => Promise<Response>, client: HttpApiClient.ForApi<typeof Api>) => Effect.Effect<A, unknown>) =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const web = yield* Effect.acquireRelease(Effect.sync(() => HttpRouter.toWebHandler(served)), (app) => Effect.promise(app.dispose));
    const fetch = ((...[input, init]: Parameters<typeof globalThis.fetch>) => web.handler(new Request(input, init), Context.empty())) as typeof globalThis.fetch;
    const raw = (json: string) => fetch(`${URL}/rate/quote`, { method: "POST", headers: { "content-type": "application/json" }, body: json });
    const client = yield* HttpApiClient.make(Api, { baseUrl: URL }).pipe(Effect.provide(FetchHttpClient.layer), Effect.provideService(FetchHttpClient.Fetch, fetch));
    return yield* body(raw, client);
  })) as Effect.Effect<A, never>);

const decimal = (text: string) => Schema.decodeUnknownSync(Rate.fields.value.value.schema as never)(text) as BigDecimal.BigDecimal;
const textOf = (d: unknown) => Schema.encodeUnknownSync(Rate.fields.value.value.schema as never)(d);
const TEXTS = ["1.50", "-0.5", "0", "10000000000000000", "0.00000000000000001", "123456789012345678901234567890.12"];

describe("Exact decimals through the API and the SDK", () => {
  it("carries a decimal to the server and back as the same text, through the client", () =>
    withServer((_, client) => Effect.gen(function* () {
      for (const text of TEXTS) {
        const answer = (yield* client.rate.quote({ payload: { value: decimal(text) } as never })) as { readonly value: unknown; readonly doubled: unknown };
        expect(BigDecimal.isBigDecimal(answer.value), text).toBe(true);
        expect(textOf(answer.value), text).toBe(text);
        expect(BigDecimal.equals(answer.doubled as BigDecimal.BigDecimal, BigDecimal.multiply(decimal(text), BigDecimal.fromStringUnsafe("2"))), text).toBe(true);
      }
    })));

  it("writes the decimal on the wire as its text, in the request and the response", () =>
    withServer((raw) => Effect.promise(async () => {
      const response = await raw(JSON.stringify({ value: "1.50" }));
      expect(response.status).toBe(200);
      const body = (await response.json()) as { readonly value: unknown; readonly doubled: unknown };
      expect(body.value).toBe("1.50");
      expect(body.doubled).toBe("3.00");
      const big = (await (await raw(JSON.stringify({ value: "10000000000000000" }))).json()) as { readonly value: unknown };
      expect(big.value).toBe("10000000000000000");
    })));

  it("refuses a payload whose decimal is no plain decimal text, before the handler runs", () =>
    withServer((raw) => Effect.promise(async () => {
      const before = handled;
      for (const bad of ['"1e3"', '".5"', '"+1"', "1.5", '"0.123456789012345678901"']) {
        expect((await raw(`{"value":${bad}}`)).status, bad).toBe(400);
      }
      expect(handled).toBe(before);
    })));
});
