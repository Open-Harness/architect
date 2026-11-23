// What a request that belongs to a run the world has reset may not do (M8.07, I2): every statement it runs, and every write it makes through a
// door of its own (the auth routes), is a write section of its token, which the reset waits for; a request the world no longer holds is refused
// before it runs anything.
import { WorldClock } from "#modules/clock/service.js";
import type { EntryEnv } from "../types.ts";
import { keeperOf } from "./entry.ts";

const refused = () => Promise.reject(new Error("this request belongs to a run the world has reset: nothing it does is written"));

/**
 * Run `f` as a write section of the request in progress. Outside a request (the world's own work), in a real world, and for a request that is
 * lent out, it is run as it is.
 */
export const section = <A>(env: EntryEnv, f: () => Promise<A>): Promise<A> => {
  if (WorldClock.declared(env).kind === "real") return f();
  const box = WorldClock.box();
  if (box === undefined) return f();
  if (box.stale) return refused();
  const id = box.id;
  if (id === undefined) return f();
  return keeperOf(env).then((keeper) => Promise.resolve(keeper.countSection(id)).then((open) => {
    if (!open) {
      box.stale = true;
      box.id = undefined;
      return refused();
    }
    return f().finally(() => keeper.countSectionEnd(id));
  }));
};

/** A database whose every statement is a write section: the handler's `SqlClient`, the store, the journal and the identity run on it. */
export const fenced = (env: EntryEnv, db: D1Database): D1Database => {
  if (WorldClock.declared(env).kind === "real") return db;
  const raws = new WeakMap<object, D1PreparedStatement>();
  const guard = (statement: D1PreparedStatement): D1PreparedStatement => {
    const proxy: D1PreparedStatement = new Proxy(statement, {
      get: (target, key) => {
        if (key === "bind") return (...values: Array<unknown>) => guard(target.bind(...values));
        if (key === "run" || key === "all" || key === "first" || key === "raw") {
          const call = Reflect.get(target, key, target) as (...args: Array<unknown>) => Promise<unknown>;
          return (...args: Array<unknown>) => section(env, () => call.apply(target, args));
        }
        return Reflect.get(target, key, target) as unknown;
      },
    });
    raws.set(proxy, statement);
    return proxy;
  };
  return new Proxy(db, {
    get: (target, key) => {
      if (key === "prepare") return (sql: string) => guard(target.prepare(sql));
      if (key === "batch") return (statements: Array<D1PreparedStatement>) => section(env, () => target.batch(statements.map((s) => raws.get(s) ?? s)));
      if (key === "exec") return (sql: string) => section(env, () => target.exec(sql));
      const value = Reflect.get(target, key, target) as unknown;
      return typeof value === "function" ? (value as (...args: Array<unknown>) => unknown).bind(target) : value;
    },
  });
};
