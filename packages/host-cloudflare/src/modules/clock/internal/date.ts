// The `Date` proxy (M8.05): one replacement of the global, installed once, whose `now()` and argument-less `new Date()`
// read the world's time for the request that is running. The store holds a clock source, not a number: a stepped world's
// instant stands still, and a scaled world's reads work out `worldAnchor + (real now - realAnchor) * speed` each time,
// from the real clock captured before the proxy went in, so a request that awaits I/O sees the world move on.
// Libraries inside the world (Better Auth, jose, Effect's default `Clock`) read `Date` at call time, so one patch reaches
// them all. Outside any request the proxy reads real time.
import { AsyncLocalStorage } from "node:async_hooks";
import type { BusyBox } from "@orthograph/language-effect";
import type { ClockSource } from "../types.ts";

const RealDate = globalThis.Date;
/** One cell per request: its source can be replaced when a durable sleep wakes (`refresh`), and nothing else can reach it. */
interface Cell {
  source: ClockSource;
  /** The request's token box, taken at its entry (`entry:<path>`) and held until the entry ends. */
  box?: BusyBox | undefined;
}
const store = new AsyncLocalStorage<Cell>();

const read = (source: ClockSource | undefined): number =>
  source === undefined ? RealDate.now() : source.kind === "stepped" ? source.instant : Math.floor(source.worldAnchor + (RealDate.now() - source.realAnchor) * source.speed);

const now = (): number => read(store.getStore()?.source);

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

/** Run `f` with the proxy reading `source` for it and everything it starts. */
export const inWorld = <A>(source: ClockSource, f: () => A): A => store.run({ source }, f);

/**
 * Run an entry in its world's time under its request's box. `end` gives the box's token back when the entry ends, whatever
 * way it ends; a callback that throws before it returns a promise is a rejection like any other, so the cleanup is always attached.
 */
export const inEntry = <A>(source: ClockSource, box: BusyBox, f: () => Promise<A>, end: (box: BusyBox) => Promise<unknown>): Promise<A> => {
  const cell: Cell = { source, box };
  return new Promise<A>((resolve) => { resolve(store.run(cell, f)); }).finally(() => end(box));
};

/** The box of the request that is running; nothing outside a request, or in a real world. */
export const boxOf = (): BusyBox | undefined => store.getStore()?.box;

/** Point the running request at a fresh source, as a durable sleep's wake does: only this request's cell, never another's. False outside a request. */
export const refresh = (source: ClockSource): boolean => {
  const cell = store.getStore();
  if (cell === undefined) return false;
  cell.source = source;
  return true;
};

/** The wall clock, whatever the proxy says. */
export const wall = (): number => RealDate.now();
