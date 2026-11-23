// What a request that belongs to a run the world has reset may not do (M8.07, I2): every statement it runs, and every write it makes through a
// door of its own (the auth routes), is a write section of its token, which the reset waits for; a request the world no longer holds is refused
// before it runs anything.
import { genOf } from "@orthograph/language-effect";
import { WorldClock } from "#modules/clock/service.js";
import type { EntryEnv } from "../types.ts";
import { keeperOf } from "./entry.ts";

const closing = () => Promise.reject(new Error("the world is being reset: this write is refused, and the request keeps its place"));
const refused = () => Promise.reject(new Error("this request belongs to a run the world has reset: nothing it does is written"));

/**
 * Run `f` as a write section of the request in progress. Outside a request (the world's own work) and in a real world it is run as it is. A
 * request whose token is lent out (a fiber of it outside the box, say a statement made while every other fiber sleeps) takes a token of its own
 * for the statement, so the section is still the world's to count and to close; a stale one is refused.
 */
export const section = <A>(env: EntryEnv, f: () => Promise<A>): Promise<A> => {
  if (WorldClock.declared(env).kind === "real") return f();
  const box = WorldClock.box();
  if (box === undefined) return f();
  if (box.stale) return refused();
  return keeperOf(env).then((keeper) => {
    const held = box.id;
    // The box's own token when it has one; otherwise one for the length of the statement, which the world closes to like any other.
    const own = held === undefined ? Promise.resolve(keeper.countEnter(`${box.owner}`)) : Promise.resolve(held);
    return own.then((id) => {
      // A token of another generation than the box's first is of a run that came after: the box is stale, and nothing it does is written.
      if (held === undefined && box.gen !== undefined && box.gen !== genOf(id)) {
        box.stale = true;
        return Promise.resolve(keeper.countLeave(id)).then(refused);
      }
      if (box.gen === undefined) box.gen = genOf(id);
      return Promise.resolve(keeper.countSection(id)).then((open) => {
      const done = () => Promise.resolve(held === undefined ? keeper.countLeave(id) : undefined);
      if (open !== true) {
        // Stale (the world does not hold the token): the box is of a run that is over. Closed (it does, and a reset is draining): refused, and the
        // box keeps its id so its own cleanup releases the token, which a reset that fails leaves in the count.
        if (open === false && held !== undefined) {
          box.stale = true;
          box.id = undefined;
        }
        return done().then(open === "closed" ? closing : refused);
      }
      return f().finally(() => Promise.resolve(keeper.countSectionEnd(id)).then(done));
      });
    });
  });
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
  // The database itself and a session of it (`withSession`) are the same door: a session's statements and batches are sections too.
  const wrap = <T extends D1Database | D1DatabaseSession>(target: T): T =>
    new Proxy(target, {
      get: (self, key) => {
        if (key === "prepare") return (sql: string) => guard(self.prepare(sql));
        if (key === "batch") return (statements: Array<D1PreparedStatement>) => section(env, () => self.batch(statements.map((s) => raws.get(s) ?? s)));
        if (key === "exec" && "exec" in self) return (sql: string) => section(env, () => self.exec(sql));
        if (key === "dump" && "dump" in self) return () => section(env, () => self.dump());
        if (key === "withSession" && "withSession" in self) return (...args: Array<unknown>) => wrap((self.withSession as (...a: Array<unknown>) => D1DatabaseSession)(...args));
        const value = Reflect.get(self, key, self) as unknown;
        return typeof value === "function" ? (value as (...args: Array<unknown>) => unknown).bind(self) : value;
      },
    });
  return wrap(db);
};
