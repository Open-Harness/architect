// A world of the app, and what a check says to a door as GitHub and Slack would: their signing schemes and headers repeated
// here by hand from what they publish (connections.ts), so a door that verifies something else is caught. The world is
// `Worlds.start` on a generated copy of the app, with each mount's signing secret a random test value made by the check and
// given to the Worker as a secret (`secretEnv`), never a key, never in a file. The secret's name is the mount's and the export's
// (frame/secrets.md: `<MOUNT>_<EXPORT>`), and the export is `webhookSigning` (README, point 5).
import { randomBytes } from "node:crypto";
import { Effect, Exit, Scope } from "effect";
import { Worlds } from "@orthograph/prove";
import { githubSignature, slackSignature, type Obj } from "./connections.ts";
import { build, run } from "./app.ts";

export interface Answer { readonly status: number; readonly body: Record<string, unknown>; readonly text: string }
export const answer = async (response: Response): Promise<Answer> => {
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(text) as Record<string, unknown>; } catch { body = {}; }
  return { status: response.status, body, text };
};

export interface Door {
  readonly url: string;
  readonly secrets: { readonly github: string; readonly slack: string };
  readonly close: () => Promise<void>;
}

/** The app in a world, its doors' secrets made here. Generating and starting are the app's own `ortho generate` and `Worlds.start`. */
export const openDoor = async (): Promise<Door> => {
  // An author's fairness proof (README, point 6 of slice 5; never CI): a throwaway door that should pass, as `{ url, github, slack }`.
  const throwaway = process.env["THROWAWAY_DOOR"];
  if (throwaway !== undefined) {
    const t = JSON.parse(throwaway) as { url: string; github: string; slack: string };
    return { url: t.url, secrets: { github: t.github, slack: t.slack }, close: async () => undefined };
  }
  const built = build();
  const secrets = { github: `ghs_${randomBytes(16).toString("hex")}`, slack: `sls_${randomBytes(16).toString("hex")}` };
  const scope = Effect.runSync(Scope.make());
  const world = await Effect.runPromise(
    Worlds.start({
      root: built.root, port: 0, name: "superagent-doors",
      secretEnv: { GITHUB_WEBHOOK_SIGNING: secrets.github, SLACK_WEBHOOK_SIGNING: secrets.slack, POSTHOG_WEBHOOK_SIGNING: randomBytes(16).toString("hex") },
    }).pipe(Effect.onError(() => Scope.close(scope, Exit.void)), Scope.provide(scope)),
  );
  return { url: world.url, secrets, close: () => Effect.runPromise(Scope.close(scope, Exit.void)) };
};
export { run };

export const trace = () => { const id = randomBytes(16).toString("hex"); return { id, header: `00-${id}-${randomBytes(8).toString("hex")}-01` }; };

export interface JournalRow { readonly id: string; readonly operation: string; readonly event: string; readonly subject: string; readonly fields: Record<string, unknown> }
/** `GET /_world/facts/journal?trace=<id>`: what the world's journals hold for the request that carried this trace. */
export const journalOf = async (url: string, traceId: string) => (await fetch(`${url}/_world/facts/journal?trace=${traceId}`).then((r) => r.json())) as ReadonlyArray<JournalRow>;

/** POST a GitHub delivery to `/_in/github`: signed by the secret unless `signature` says otherwise (`null` sends none). */
export const github = (door: Door, event: string, payload: Obj | string, options: { readonly signature?: string | null; readonly delivery?: string; readonly trace?: string; readonly mount?: string; readonly method?: string } = {}) => {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const signature = options.signature === undefined ? githubSignature(door.secrets.github, raw) : options.signature;
  return fetch(`${door.url}/_in/${options.mount ?? "github"}`, {
    method: options.method ?? "POST",
    headers: {
      "content-type": "application/json", "x-github-event": event, "x-github-delivery": options.delivery ?? crypto.randomUUID(),
      ...(signature === null ? {} : { "x-hub-signature-256": signature }), ...(options.trace ? { traceparent: options.trace } : {}),
    },
    ...((options.method ?? "POST") === "GET" ? {} : { body: raw }),
  }).then(answer);
};

/** POST a Slack Events API delivery to `/_in/slack`: signed `v0` at `at` (seconds) unless `signature` says otherwise. */
export const slack = (door: Door, payload: Obj | string, options: { readonly signature?: string | null; readonly at?: number; readonly stamp?: number | null; readonly retry?: number; readonly trace?: string } = {}) => {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const at = options.at ?? Math.floor(Date.now() / 1000);
  const signature = options.signature === undefined ? slackSignature(door.secrets.slack, at, raw) : options.signature;
  const stamp = options.stamp === undefined ? at : options.stamp;
  return fetch(`${door.url}/_in/slack`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(signature === null ? {} : { "x-slack-signature": signature }), ...(stamp === null ? {} : { "x-slack-request-timestamp": String(stamp) }),
      ...(options.retry === undefined ? {} : { "x-slack-retry-num": String(options.retry), "x-slack-retry-reason": "http_timeout" }), ...(options.trace ? { traceparent: options.trace } : {}),
    },
    body: raw,
  }).then(answer);
};
