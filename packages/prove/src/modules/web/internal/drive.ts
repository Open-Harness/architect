// One call, replayed by a person in a browser: open the scene, fill in what the model says is typed, press what the piece offers, and
// take the world's own answer to the request the page made. The request carries the journey's trace and, when the step names one, its
// request key, so the call is judged by the same checks and the same spans as the one made over HTTP.
import { Effect, Option, Schema } from "effect";
import type { Browser, Page, Route } from "playwright";
import type { WebAnswer, WebCall } from "../types.ts";
import { PAGE, labelOf, type Bundle, type Plan } from "./scene.ts";

const SCENE_SECONDS = 20_000;
const ANSWER_SECONDS = 15_000;

const parse = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));
const said = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));
const page = <A>(run: () => Promise<A>) => Effect.tryPromise({ try: run, catch: said });

/** The browser's own request, with the journey's trace in place of the one the client made, and the step's request key. */
const traced = (call: WebCall) => (route: Route) => {
  const { b3: _b3, ...kept } = route.request().headers();
  return route.continue({ headers: { ...kept, traceparent: `00-${call.trace}-${call.parent}-01`, ...(call.request === undefined ? {} : { "idempotency-key": call.request }) } });
};

/** What a person does on the page once the piece is mounted. */
const act = (target: Page, plan: Plan, call: WebCall): Effect.Effect<void, string> =>
  Effect.gen(function* () {
    if (plan.kind === "read") return;
    for (const key of plan.inputs) yield* page(() => target.getByLabel(labelOf(key), { exact: true }).fill(String(call.wire[key] ?? "")));
    if (plan.kind === "form") return yield* page(() => target.getByRole("button").click());
    // A dialog: a person's own press on the confirming control is the yes, so nobody is asked.
    yield* page(() => target.getByRole("button").first().click());
    yield* page(() => target.getByRole("alertdialog").locator("[data-agent-confirm]").click());
  });

/** The scene is mounted, or the page failed first (a piece that throws never mounts). */
const mounted = (target: Page): Effect.Effect<void, string> =>
  page(() => {
    const failed = new Promise<never>((_, reject) => target.once("pageerror", (error) => reject(new Error(`the page failed: ${error.message}`))));
    return Promise.race([target.waitForFunction("window.__prove && window.__prove.ready === true", undefined, { timeout: SCENE_SECONDS }).then(() => undefined), failed]);
  });

export const replay = (browser: Browser, base: string, scene: Bundle, plan: Plan, call: WebCall): Effect.Effect<WebAnswer> => {
  const path = `/${plan.thing}/${plan.verb}`;
  const props = Object.fromEntries(plan.given.map((key) => [key, String(call.wire[key] ?? "")]));
  return Effect.scoped(
    Effect.gen(function* () {
      const target = yield* Effect.acquireRelease(page(() => browser.newPage()), (opened) => Effect.promise(() => opened.close().catch(() => undefined)));
      const files: Record<string, readonly [string, string]> = { "/__prove/index.html": [PAGE(), "text/html"], "/__prove/scene.js": [scene.js, "text/javascript"], "/__prove/scene.css": [scene.css, "text/css"] };
      yield* page(() => target.route((url) => url.pathname in files, (route) => {
        const [body, contentType] = files[new URL(route.request().url()).pathname]!;
        return route.fulfill({ status: 200, contentType, body });
      }));
      yield* page(() => target.route((url) => url.pathname === path, traced(call)));
      // The session goes in as the page loads and is never printed.
      yield* page(() => target.addInitScript({ content: `window.__prove = ${JSON.stringify({ token: call.token === "" ? undefined : call.token, props })};` }));
      yield* page(() => target.goto(`${base}/__prove/index.html`));
      yield* mounted(target);
      const answered = target.waitForResponse((r) => new URL(r.url()).pathname === path && r.request().method() === "POST", { timeout: ANSWER_SECONDS });
      yield* act(target, plan, call).pipe(Effect.tapError(() => Effect.promise(() => answered.catch(() => undefined))));
      const response = yield* page(() => answered);
      const text = yield* page(() => response.text());
      return { status: response.status(), body: Option.getOrElse(parse(text), () => (text === "" ? null : text)) as unknown };
    }),
  ).pipe(Effect.catch((message: string) => Effect.succeed({ status: 0, body: { web: message } })));
};
