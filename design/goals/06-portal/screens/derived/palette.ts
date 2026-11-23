// Generated from the blueprint. Do not edit.

export type Allowed =
  | { readonly kind: "anyone" }
  | { readonly kind: "signed-in" }
  | { readonly kind: "role"; readonly role: string }
  | { readonly kind: "role-of"; readonly role: string; readonly path: string };

export type PaletteEntry =
  | { readonly kind: "page"; readonly name: string; readonly path: string; readonly description: string; readonly allowed: ReadonlyArray<Allowed> }
  | { readonly kind: "operation"; readonly name: string; readonly page: string; readonly component: string | null; readonly description: string; readonly allowed: ReadonlyArray<Allowed> };

export type Caller = "anonymous" | "person";

export const entries: ReadonlyArray<PaletteEntry> = [
  {
    "kind": "page",
    "name": "handle",
    "path": "/things/handle",
    "description": "A public name that belongs to one person until they release it, and is the address of a public page.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "home",
    "path": "/",
    "description": "The things plugged-in is made of.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "link",
    "path": "/things/link",
    "description": "A title and web address on a public page.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "profile",
    "path": "/things/profile",
    "description": "A claimed name's public page, with its links in the order they were put.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "operation",
    "name": "handle.claim",
    "page": "handle",
    "component": null,
    "description": "Claim a free name and make it the address of your public page, with its profile.",
    "allowed": [
      {
        "kind": "signed-in"
      }
    ]
  },
  {
    "kind": "operation",
    "name": "handle.release",
    "page": "handle",
    "component": null,
    "description": "Free your name and take its public page offline. Anyone may claim the name afterwards.",
    "allowed": [
      {
        "kind": "role",
        "role": "handle.handleOwner"
      }
    ]
  },
  {
    "kind": "operation",
    "name": "handle.resolve",
    "page": "handle",
    "component": null,
    "description": "Find the handle that holds a claimed name. A released or unclaimed name has none.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "operation",
    "name": "link.add",
    "page": "link",
    "component": null,
    "description": "Append a link to your own public page. You need a claimed name first.",
    "allowed": [
      {
        "kind": "signed-in"
      }
    ]
  },
  {
    "kind": "operation",
    "name": "link.order",
    "page": "link",
    "component": null,
    "description": "Move a link to a zero-based position. A position past the end puts it last.",
    "allowed": [
      {
        "kind": "role",
        "role": "link.linkOwner"
      }
    ]
  },
  {
    "kind": "operation",
    "name": "link.remove",
    "page": "link",
    "component": null,
    "description": "Remove a link from a public page.",
    "allowed": [
      {
        "kind": "role",
        "role": "link.linkOwner"
      }
    ]
  },
  {
    "kind": "operation",
    "name": "profile.get",
    "page": "profile",
    "component": null,
    "description": "Read a claimed name's public page and its links in display order.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  }
];

/** An anonymous caller passes only `anyone`. A person passes `anyone`, `signed-in` or a role: a role is decided on an instance, so it is not ruled out here. */
const passes = (allowed: ReadonlyArray<Allowed>, caller: Caller): boolean =>
  caller === "person" ? allowed.length > 0 : allowed.some((a) => a.kind === "anyone");

/** What the caller may open and call: a page whose `allowed` they pass, and an operation of such a page whose own `allowed` they pass. */
export const visibleTo = (caller: Caller): ReadonlyArray<PaletteEntry> => {
  const pages = new Set(entries.flatMap((e) => (e.kind === "page" && passes(e.allowed, caller) ? [e.name] : [])));
  return entries.filter((e) => (e.kind === "page" ? pages.has(e.name) : pages.has(e.page) && passes(e.allowed, caller)));
};
