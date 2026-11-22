// A world started from a project copy, for the checks that drive the world's front door themselves (Worlds.start, as
// check m1/13 does), and the door's clock routes as M8-checks assumes them.
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { Effect } from "effect";
import { Worlds } from "@orthograph/prove";
import { repo } from "./support.ts";

export interface World {
  readonly url: string;
  /** The world's chain, when the check stood one: Anvil's RPC. */
  readonly rpc?: string;
}

/** Start the project at `root` in a world for the length of `use`; a chain beside it when `chain` is set (stage 1's Anvil). */
export const inWorld = <A>(root: string, name: string, use: (world: World) => Promise<A>, options: { readonly chain?: boolean } = {}) =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const chain = options.chain ? yield* Effect.promise(() => standChain()) : undefined;
    const started = yield* Worlds.start({ root, port: 0, name, ...(chain ? { chain } : {}) } as Parameters<typeof Worlds.start>[0]);
    const rpc = (started as { readonly chain?: { readonly rpcUrl: string } }).chain?.rpcUrl;
    return yield* Effect.promise(() => use({ url: started.url, ...(rpc ? { rpc } : {}) }));
  })));

/**
 * Anvil from stage 1's `@orthograph/chain-evm` (M1.30, M1.31), as the effect `Worlds.start` acquires in the world's scope.
 * Imported by path (and `TimersLive` with it): on a branch without them this throws, naming what is missing.
 */
const standChain = async (): Promise<Effect.Effect<unknown, unknown, never>> => {
  const evm = (await import(pathToFileURL(join(repo, "packages/chain-evm/src/main.ts")).href)) as { readonly Anvil: { readonly start: (o: object) => Effect.Effect<{ readonly rpcUrl: string; readonly chainId: number; readonly accounts: ReadonlyArray<unknown> }, unknown, never> } };
  const language = (await import(pathToFileURL(join(repo, "packages/language-effect/src/index.ts")).href)) as { readonly TimersLive: never };
  return evm.Anvil.start({ accounts: 1 }).pipe(
    Effect.provide(language.TimersLive),
    Effect.map((anvil) => ({ rpcUrl: anvil.rpcUrl, chainId: anvil.chainId, accounts: anvil.accounts })),
  ) as Effect.Effect<unknown, unknown, never>;
};

export interface Answer {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

const json = async (response: Response): Promise<Answer> => {
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(text) as Record<string, unknown>; } catch { body = { text }; }
  return { status: response.status, body };
};

/** `POST /<thing>/<verb>` with a JSON body, as the generated server routes it, as a cast member when a token is given. */
export const call = (url: string, operation: string, payload: object, token?: string) =>
  fetch(`${url}/${operation.replace(".", "/")}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  }).then(json);

export interface Clock {
  readonly kind: string;
  readonly now: string;
  readonly timers: ReadonlyArray<{ readonly due: string; readonly owner: string; readonly name: string }>;
}

/** `GET /_world/clock` (M8-checks): the world's clock, its kind, and its timer table. */
export const clockOf = async (url: string): Promise<Clock> => {
  const answer = await fetch(`${url}/_world/clock`).then(json);
  if (answer.status !== 200) throw new Error(`GET /_world/clock answered ${answer.status}: ${JSON.stringify(answer.body)}`);
  return answer.body as unknown as Clock;
};

/** `POST /_world/clock/advance` with `{ span }` (M8-checks): answers once the world is quiet at the target. */
export const advance = (url: string, span: string) =>
  fetch(`${url}/_world/clock/advance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ span }) }).then(json);

/** `POST /_world/clock/move-to` with `{ to }` (M8-checks). */
export const moveTo = (url: string, to: string) =>
  fetch(`${url}/_world/clock/move-to`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to }) }).then(json);

/** The chain's latest block over JSON-RPC: its number and its timestamp in epoch milliseconds. */
export const latestBlock = async (rpc: string) => {
  const response = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", false] }) });
  const { result } = (await response.json()) as { readonly result: { readonly number: string; readonly timestamp: string } };
  return { number: Number(BigInt(result.number)), ms: Number(BigInt(result.timestamp)) * 1000 };
};

/** Poll `read` until `done` holds, or give up after `ms` and return what it last saw. */
export const until = async <A>(read: () => Promise<A>, done: (a: A) => boolean, ms = 30_000): Promise<A> => {
  const end = Date.now() + ms;
  let last = await read();
  while (!done(last) && Date.now() < end) {
    await new Promise<void>((resolve) => { setTimeout(resolve, 50); });
    last = await read();
  }
  return last;
};
