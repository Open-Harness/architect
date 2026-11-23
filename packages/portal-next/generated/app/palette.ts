// Generated from blueprint/projections/app.ts. Do not edit.

export type Allowed =
  | { readonly kind: "anyone" }
  | { readonly kind: "signed-in"; readonly via?: ReadonlyArray<string> }
  | { readonly kind: "system" }
  | { readonly kind: "keeper" }
  | { readonly kind: "role"; readonly role: string; readonly via?: ReadonlyArray<string>; readonly service?: string }
  | { readonly kind: "role-of"; readonly role: string; readonly path: string; readonly via?: ReadonlyArray<string>; readonly service?: string };

export type PaletteEntry =
  | { readonly kind: "page"; readonly name: string; readonly path: string; readonly description: string; readonly allowed: ReadonlyArray<Allowed> }
  | { readonly kind: "operation"; readonly name: string; readonly page: string; readonly component: string | null; readonly description: string; readonly allowed: ReadonlyArray<Allowed> };

export type Caller = "anonymous" | "person";

export const entries: ReadonlyArray<PaletteEntry> = [
  {
    "kind": "page",
    "name": "access",
    "path": "/portal/reference/access",
    "description": "Who may call what.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "compare",
    "path": "/portal/compare",
    "description": "Every environment side by side.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "environment",
    "path": "/portal/environments/:name",
    "description": "One declared environment: its summary, its fields and its proof.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "events",
    "path": "/portal/reference/events",
    "description": "Every event a thing emits.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "home",
    "path": "/portal",
    "description": "The things as cards in the tree's order, and what each did in the window.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "journeys",
    "path": "/portal/journeys",
    "description": "Every declared journey as a sequence of steps.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "machines",
    "path": "/portal/reference/machines",
    "description": "Every lifecycle.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "monitor",
    "path": "/portal/monitor",
    "description": "The alerts, issues and objectives the declarations imply.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "operation",
    "path": "/portal/operations/:name",
    "description": "One operation, on five tabs: contract, metrics, proof, docs and notes.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "plugins",
    "path": "/portal/plugins",
    "description": "A card per mounted plugin, then the stores and what each runs on.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "refusals",
    "path": "/portal/reference/refusals",
    "description": "Every refusal code, counted in the window.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "thing",
    "path": "/portal/things/:name",
    "description": "One thing: its lifecycle, its operations, its rules, events and errors.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "trace",
    "path": "/portal/traces/:id",
    "description": "One call's trace: its structure and timing, never a value.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "values",
    "path": "/portal/reference/values",
    "description": "Every value a field can take.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  },
  {
    "kind": "page",
    "name": "worlds",
    "path": "/portal/starting-worlds",
    "description": "The starting worlds, and the journeys that start from each.",
    "allowed": [
      {
        "kind": "anyone"
      }
    ]
  }
];

/**
 * The rule. An anonymous caller passes only `anyone`. A person passes `anyone` and `signed-in`. A role (`role`, or `role-of` by its
 * role's name) is decided on an instance: it passes only when `roles` (the names the caller
 * holds, such as `link.linkOwner`) has it, and no `roles` means none held. `system`, `keeper` and a service role are never a person; `via` (the ways in a mount kept) does not change who may open a page, so the entry's own rule decides. Nobody passes an empty `allowed`.
 */
const passes = (allowed: ReadonlyArray<Allowed>, caller: Caller, roles?: ReadonlyArray<string>): boolean =>
  allowed.some((a) => {
    if (a.kind === "anyone") return true;
    if (caller !== "person") return false;
    if (a.kind === "system" || a.kind === "keeper") return false;
    if (a.kind === "signed-in") return true;
    return a.service === undefined && (roles ?? []).includes(a.role);
  });

/** What the caller may open and call: a page whose `allowed` they pass, and an operation of such a page whose own `allowed` they pass. */
export const visibleTo = (caller: Caller, roles?: ReadonlyArray<string>): ReadonlyArray<PaletteEntry> => {
  const pages = new Set(entries.flatMap((e) => (e.kind === "page" && passes(e.allowed, caller, roles) ? [e.name] : [])));
  return entries.filter((e) => (e.kind === "page" ? pages.has(e.name) : pages.has(e.page) && passes(e.allowed, caller, roles)));
};
