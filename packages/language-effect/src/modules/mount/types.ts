// The mount a plugin's handler runs under: which options the app picked. A reference, so it is never a requirement a
// handler has to declare; outside any mount (a plugin's own example app) every choice is at its first option.
import { Context, type Effect } from "effect";
import type { Mount as MountOf, Option } from "orthograph";

export const Mounted = Context.Reference<Pick<MountOf, "verbs"> | undefined>("@orthograph/language-effect/Mounted", { defaultValue: () => undefined });

export interface MountApi {
  /** Whether the app that mounted this plugin picked `option`: by identity, never by a written name. */
  readonly picked: (option: Option) => Effect.Effect<boolean>;
  /** Run a plugin's handler under its app's mount: the generated server does this for each plugin operation. */
  readonly under: (mount: Pick<MountOf, "verbs">) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  /** A plugin's handler, every call of it run under `mount`: what the generated server serves for a plugin operation. */
  readonly serving: <P extends ReadonlyArray<unknown>, A, E, R>(mount: Pick<MountOf, "verbs">, handler: (...args: P) => Effect.Effect<A, E, R>) => (...args: P) => Effect.Effect<A, E, R>;
}
