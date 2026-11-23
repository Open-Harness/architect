// The generated client, as an action's host: each call builds the SDK's layer, runs the call as one signed-in person, and marks the
// request with the key of the form that sent it and with who pressed. The key and the source travel as headers on this call's own fetch.
import { Effect, Layer } from "effect";
import type { Context } from "effect";
import { FetchHttpClient } from "effect/http";
import { runForAction, type ActionContext, type ActionHost } from "orthograph/actions";

/** The one service a client layer provides: `PluggedIn.layer(...)` is the layer of the app's client and nothing else (Effect's own `effect/…` services aside). */
const serviceOf = (context: Context.Context<unknown>): Effect.Effect<unknown> => {
  const services = [...context.mapUnsafe].filter(([key]) => !key.startsWith("effect/")).map(([, service]) => service);
  return services.length === 1 ? Effect.succeed(services[0]) : Effect.die(new Error(`WebHost.make takes the generated client's layer, which provides one service; this one provides ${services.length}`));
};

export const requestKeyOf = (ctx?: ActionContext): string | undefined => (ctx?.toolCallId === undefined ? undefined : `web:${ctx.toolCallId}`);

/** This call's fetch: the browser's own, with the request key and the source added to what the SDK built. */
const marked = (ctx?: ActionContext): typeof fetch => (input, init) => {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const key = requestKeyOf(ctx);
  if (key !== undefined) headers.set("idempotency-key", key);
  headers.set("x-ortho-source", ctx?.caller === "agent" ? "agent" : "person");
  return globalThis.fetch(input, { ...init, headers });
};

export const hostOf = (client: Layer.Layer<any, any, never>): ActionHost<any> => ({
  requestKey: requestKeyOf,
  call: (use, ctx) =>
    runForAction(
      Effect.scoped(Layer.build(client).pipe(Effect.flatMap((context) => Effect.flatMap(serviceOf(context), (service) => use(service))))).pipe(
        Effect.provideService(FetchHttpClient.Fetch, marked(ctx)),
      ),
      ctx,
    ),
});
