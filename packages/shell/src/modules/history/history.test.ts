import { describe, expect, it } from "vitest";
import { fakeWindow } from "./internal/fake.ts";
import { History } from "./service.ts";

describe("History.browser", () => {
  it("pushes one entry, tells every subscriber, and does not push the address it is at", () => {
    const win = fakeWindow("/");
    const history = History.browser(win);
    let told = 0;
    history.subscribe(() => { told += 1; });
    history.push("/account");
    history.push("/account");
    expect(history.path()).toBe("/account");
    expect(win.entries()).toEqual(["/", "/account"]);
    expect(told).toBe(1);
  });

  it("follows the browser's back and forward, and stops when unsubscribed", () => {
    const win = fakeWindow("/");
    const history = History.browser(win);
    const seen: string[] = [];
    const stop = history.subscribe(() => { seen.push(history.path()); });
    history.push("/@aaron?tab=links");
    win.back();
    win.forward();
    expect(seen).toEqual(["/@aaron", "/", "/@aaron"]);
    stop();
    win.back();
    expect(seen).toHaveLength(3);
  });

  it("keeps a query out of the path and in the address it compares", () => {
    const win = fakeWindow("/things?x=1");
    const history = History.browser(win);
    expect(history.path()).toBe("/things");
    history.push("/things?x=1");
    expect(win.entries()).toEqual(["/things?x=1"]);
  });
});
