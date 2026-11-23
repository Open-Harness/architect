// The `Date` proxy (M8.05): one replacement of the global, installed once, whose `now()` and argument-less `new Date()`
// read the instant stored for the running request. Libraries inside the world (Better Auth, jose, Effect's default
// `Clock`) read `Date` at call time, so one patch reaches them all. Outside any request the proxy reads real time.
import { AsyncLocalStorage } from "node:async_hooks";

const RealDate = globalThis.Date;
const store = new AsyncLocalStorage<number>();

const now = (): number => store.getStore() ?? RealDate.now();

const WorldDate: DateConstructor = new Proxy(RealDate, {
  // `newTarget` is forwarded so a subclass of Date keeps its own prototype and methods.
  construct: (target, args, newTarget) => Reflect.construct(target, args.length === 0 ? [now()] : args, newTarget),
  // `Date()` called without `new` returns a string.
  apply: () => new RealDate(now()).toString(),
  get: (target, key) => (key === "now" ? now : Reflect.get(target, key, target)),
});

/** Replace the global `Date` with the proxy. Safe to call again. */
export const install = (): void => {
  if (globalThis.Date !== WorldDate) globalThis.Date = WorldDate;
};

/** Run `f` with the proxy reading `instant` for it and everything it starts. */
export const inWorld = <A>(instant: number, f: () => A): A => store.run(instant, f);

/** The wall clock, whatever the proxy says. */
export const wall = (): number => RealDate.now();
