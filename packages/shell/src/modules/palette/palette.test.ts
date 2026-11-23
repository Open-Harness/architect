import { describe, expect, it } from "vitest";
import { Palette } from "./service.ts";
import type { Allowed, PaletteEntry } from "./types.ts";

const anyone: Allowed = { kind: "anyone" };
const signedIn: Allowed = { kind: "signed-in" };
const owner: Allowed = { kind: "role", role: "link.linkOwner" };
const page = (name: string, allowed: ReadonlyArray<Allowed>): PaletteEntry => ({ kind: "page", name, path: `/${name}`, description: "", allowed });
const op = (name: string, on: string, allowed: ReadonlyArray<Allowed>): PaletteEntry => ({ kind: "operation", name, page: on, component: null, description: "", allowed });
const entries: ReadonlyArray<PaletteEntry> = [
  page("account", [signedIn]),
  page("edit", [signedIn]),
  page("home", [anyone]),
  page("profile", [anyone]),
  op("handle.claim", "home", [signedIn]),
  op("link.add", "profile", [owner]),
  op("profile.get", "profile", [anyone]),
];
const names = (caller: "anonymous" | "person", on: string | undefined) => Palette.visible(entries, caller, on).map((e) => e.name);

describe("visible", () => {
  it("lists a person every page, then the operations of the page they are on, in the index's order", () => {
    expect(names("person", "profile")).toEqual(["account", "edit", "home", "profile", "profile.get"]);
    expect(Palette.visible(entries, "person", "profile", ["link.linkOwner"]).map((e) => e.name)).toEqual(["account", "edit", "home", "profile", "link.add", "profile.get"]);
    expect(Palette.visible(entries, "anonymous", "profile", ["link.linkOwner"]).map((e) => e.name)).toEqual(["home", "profile", "profile.get"]);
    expect(names("person", "home")).toEqual(["account", "edit", "home", "profile", "handle.claim"]);
  });

  it("lists an anonymous caller only what `anyone` may open and call", () => {
    expect(names("anonymous", "profile")).toEqual(["home", "profile", "profile.get"]);
    expect(names("anonymous", "home")).toEqual(["home", "profile"]);
  });

  it("lists no operation on a path that is no page, and none of a page the caller may not open", () => {
    expect(names("person", undefined)).toEqual(["account", "edit", "home", "profile"]);
    expect(names("anonymous", "account")).toEqual(["home", "profile"]);
  });
});
