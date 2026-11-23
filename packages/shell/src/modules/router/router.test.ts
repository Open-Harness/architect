import { describe, expect, it } from "vitest";
import { Router } from "./service.ts";
import type { RouteTable } from "./types.ts";

const table: RouteTable = {
  routes: [
    { page: "account", path: "/account", params: [], parent: "home" },
    { page: "edit", path: "/@:handle/edit", params: ["handle"], parent: "profile" },
    { page: "home", path: "/", params: [] },
    { page: "profile", path: "/@:handle", params: ["handle"], parent: "home" },
    { page: "thing", path: "/things/:name", params: ["name"], parent: "home" },
    { page: "thing-new", path: "/things/new", params: [], parent: "home" },
    { page: "orphan", path: "/orphan", params: [] },
  ],
};
const router = Router.make(table, "home");

describe("match", () => {
  it("resolves a path to its page, decoding the parameters", () => {
    expect(router.match("/")).toEqual({ page: "home", params: {} });
    expect(router.match("/account")).toEqual({ page: "account", params: {} });
    expect(router.match("/@aaron")).toEqual({ page: "profile", params: { handle: "aaron" } });
    expect(router.match("/@a%20b/edit")).toEqual({ page: "edit", params: { handle: "a b" } });
    expect(router.match("/@%C3%A9")).toEqual({ page: "profile", params: { handle: "é" } });
  });

  it("prefers a literal segment to a parameter, whatever the order of the table", () => {
    expect(router.match("/things/new")?.page).toBe("thing-new");
    expect(router.match("/things/handle")).toEqual({ page: "thing", params: { name: "handle" } });
  });

  it("takes a trailing slash, and answers undefined for a path that is no route", () => {
    expect(router.match("/account/")?.page).toBe("account");
    for (const path of ["/nowhere", "/@aaron/edit/extra", "/things", "/account/x", "/@", "/@%zz", "/@%E0%A4"]) expect(router.match(path), path).toBeUndefined();
  });
});

describe("href", () => {
  it("fills a page's path, percent-encoding each parameter", () => {
    expect(router.href("home", {})).toBe("/");
    expect(router.href("profile", { handle: "aaron" })).toBe("/@aaron");
    expect(router.href("edit", { handle: "a b" })).toBe("/@a%20b/edit");
  });

  it("is undefined where a parameter is missing or the page is not declared", () => {
    expect(router.href("profile", {})).toBeUndefined();
    expect(router.href("thing", { handle: "aaron" })).toBeUndefined();
    expect(router.href("nowhere", {})).toBeUndefined();
  });

  it("round-trips through match", () => {
    expect(router.match(router.href("edit", { handle: "a/b ü" }) ?? "")).toEqual({ page: "edit", params: { handle: "a/b ü" } });
  });
});

describe("a parameter's bytes", () => {
  const roundTrip = (handle: string) => router.match(router.href("profile", { handle }) ?? "");
  it("a leading byte-order mark and a literal U+FFFD are values, and round-trip through href", () => {
    expect(roundTrip("﻿aaron")).toEqual({ page: "profile", params: { handle: "﻿aaron" } });
    expect(roundTrip("a�b")).toEqual({ page: "profile", params: { handle: "a�b" } });
    expect(roundTrip("�")).toEqual({ page: "profile", params: { handle: "�" } });
  });

  it("bytes that are not UTF-8 are no route, never a throw", () => {
    for (const path of ["/@%FF", "/@a%C3", "/@%C0%AF", "/@%ED%A0%80"]) expect(router.match(path), path).toBeUndefined();
  });
});

describe("chain", () => {
  it("is the parents, home first and the page last", () => {
    expect(router.chain("edit")).toEqual(["home", "profile", "edit"]);
    expect(router.chain("home")).toEqual(["home"]);
    expect(router.chain("account")).toEqual(["home", "account"]);
  });

  it("starts at home when the page's own chain does not, and stops on a cycle", () => {
    expect(router.chain("orphan")).toEqual(["home", "orphan"]);
    const loop = Router.make({ routes: [{ page: "a", path: "/a", params: [], parent: "b" }, { page: "b", path: "/b", params: [], parent: "a" }] }, "home");
    expect(loop.chain("a")).toEqual(["b", "a"]);
  });
});
