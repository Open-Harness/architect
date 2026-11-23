// Reads the blueprint's layout: which file holds what, and the name each declaration takes from its path or export.
import type { Agent, AnyErrorClass, Declared, Environment, Event, Held, Hold, Journey, Machine, Mount, Operation, Problem, Read, Role, SourceKind, StartingWorld, Store, Thing, Unique, Value } from "orthograph";
import type { LoadedFile } from "#modules/source/types.js";
import type { CallReach } from "#modules/mounts/types.js";

import type { FromModel } from "../types.ts";

/** Where a plugin's store came from (M1-plugins section 7): `store` is the plugin's own name for it. */
export interface StoreFrom {
  readonly mount: string;
  readonly package: string;
  readonly version: string;
  readonly store: string;
}

/** A store declared in `blueprint/stores/<name>.ts`, or brought by a mount under the name `<mount>-<name>`. */
export interface StoreFile {
  readonly name: string;
  readonly file: string;
  readonly store: Store;
  readonly from?: StoreFrom;
}

export interface ThingFiles {
  readonly name: string;
  /** Its folder, as messages name it: `blueprint/things/<name>`, or `<package>/blueprint/things/<thing>`. */
  readonly base: string;
  readonly from: FromModel;
  thing?: Thing;
  machine?: Machine;
  readonly events: Map<string, Event>;
  readonly errors: Map<string, AnyErrorClass>;
  readonly roles: Map<string, Role>;
  /** Its rules (G5), by the name each export gives them: `handle.oneHolderPerName` is `oneHolderPerName`. */
  readonly invariants: Map<string, Unique>;
  readonly verbs: Map<string, { readonly file: string; readonly declaration: Operation | Read; /** Set on an operation the app adds to a plugin's thing. */ readonly from?: FromModel }>;
  /** What can fail, beside the thing (`problem.ts`). */
  problem?: { readonly file: string; readonly declaration: Problem };
  /** The switches it declares (`holds.ts`), by the name each export gives them. */
  readonly holds: Map<string, { readonly file: string; readonly declaration: Hold }>;
}

interface StoryFile<D> {
  readonly file: string;
  readonly declaration: D;
  readonly sourceHash?: string;
}

export interface Layout {
  readonly journeys: Map<string, StoryFile<Journey>>;
  readonly startingWorlds: Map<string, StoryFile<StartingWorld>>;
  readonly values: Map<string, Value>;
  /** Environments by the name their file gives them: `environments/staging.ts` is `staging`. */
  readonly environments: Map<string, { readonly file: string; readonly declaration: Environment }>;
  /** Stores by the name their file gives them: `stores/ledger.ts` is `ledger`. */
  readonly stores: Map<string, StoreFile>;
  readonly things: Map<string, ThingFiles>;
  /** Mounts by the name their file gives them: `features/echo.ts` is `echo`. */
  readonly mounts: Map<string, MountFile>;
  /** What each mounted adapter's call is, by the call object a step holds (filled in when the mounts are folded). */
  readonly calls: Map<unknown, CallReach>;
  /** `blueprint/agents/<name>.ts`: an agent kind, by the file's name. */
  readonly agents: Map<string, { readonly file: string; readonly declaration: Agent; /** The mount that brought it; absent for the app's own. */ readonly mount?: string }>;
  /** `blueprint/agents/<name>.ts` that declare an instance of a thing (`Superagent.declare`). */
  readonly declared: Map<string, { readonly file: string; readonly declaration: Declared }>;
  /** `blueprint/sources/<name>.ts`: a source kind, by the file's name. */
  readonly sources: Map<string, { readonly file: string; readonly declaration: SourceKind<any>; /** The name it is exported under: what a message says to add. */ readonly exportName: string; readonly mount?: string; readonly package?: string }>;
  /** What a mount file says a hold holds (`export const pausable = processing.holds({...})`), with the file. */
  readonly holdLists: Array<{ readonly file: string; readonly name: string; readonly declaration: Held }>;
  readonly problems: Array<string>;
}

export const MOUNT_FOLDERS = { features: "feature", adapters: "adapter", projections: "projection" } as const;
export interface MountFile {
  readonly name: string;
  readonly kind: (typeof MOUNT_FOLDERS)[keyof typeof MOUNT_FOLDERS];
  readonly file: string;
  readonly mount: Mount;
}

const kindOf = (x: unknown): string | undefined =>
  typeof x === "object" && x !== null ? ((x as { kind?: unknown }).kind as string | undefined) : undefined;
const isErrorClass = (x: unknown): x is AnyErrorClass =>
  typeof x === "function" && "exit" in x && "fields" in x && "schema" in x;

export const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Read files laid out as a blueprint. `at` says how a file is named in messages and imports: the project's own are
 * `blueprint/<path>`; a plugin's are its package specifier, `@x/y/blueprint/<path>`, and only its `things/` are read.
 */
export const readLayout = (files: ReadonlyArray<LoadedFile>, at: (path: string) => string = (path) => path.startsWith("../") ? path.slice(3) : `blueprint/${path}`): Layout => {
  const layout: Layout = { values: new Map(), environments: new Map(), stores: new Map(), things: new Map(), mounts: new Map(), calls: new Map(), agents: new Map(), declared: new Map(), sources: new Map(), holdLists: [], journeys: new Map(), startingWorlds: new Map(), problems: [] };
  const thingFiles = (name: string): ThingFiles => {
    const found = layout.things.get(name);
    if (found) return found;
    const fresh: ThingFiles = { name, base: at(`things/${name}`), from: { kind: "app" }, events: new Map(), errors: new Map(), roles: new Map(), invariants: new Map(), verbs: new Map(), holds: new Map() };
    layout.things.set(name, fresh);
    return fresh;
  };

  for (const { path, exports, sourceHash } of files) {
    const parts = path.replace(/\.(ts|js)$/, "").split("/");
    if ((parts[0] === "journeys" && parts.length === 2) || (parts[0] === ".." && parts[1] === "journeys" && parts.length === 3)) {
      const d = exports["default"];
      if (kindOf(d) !== "journey") layout.problems.push(`${at(path)}: the default export must be a Blueprint.journey`);
      else layout.journeys.set(at(path), { file: at(path), declaration: d as Journey, ...(sourceHash ? { sourceHash } : {}) });
      continue;
    }
    if (parts[0] === "starting-worlds" && parts.length === 2) {
      const d = exports["default"] as StartingWorld;
      if (kindOf(d) !== "starting-world") layout.problems.push(`${at(path)}: the default export must be a Blueprint.startingWorld`);
      else if (layout.startingWorlds.has(d.name)) layout.problems.push(`${at(path)}: starting world "${d.name}" is already declared`);
      else layout.startingWorlds.set(d.name, { file: at(path), declaration: d, ...(sourceHash ? { sourceHash } : {}) });
      continue;
    }
    const folder = parts[0] as keyof typeof MOUNT_FOLDERS;
    if (Object.hasOwn(MOUNT_FOLDERS, folder) && parts.length === 2) {
      const name = parts[1]!;
      if (!NAME.test(name)) layout.problems.push(`${at(path)}: mount "${name}" must be lowercase words joined by dashes`);
      const d = exports["default"];
      if (kindOf(d) !== "mount") layout.problems.push(`${at(path)}: the default export must be a Blueprint.use(…) of a ${MOUNT_FOLDERS[folder]}`);
      else layout.mounts.set(name, { name, kind: MOUNT_FOLDERS[folder], file: at(path), mount: d as Mount });
      for (const [k, v] of Object.entries(exports)) if (kindOf(v) === "holds") layout.holdLists.push({ file: at(path), name: k, declaration: v as Held });
      continue;
    }
    if (parts[0] === "agents" && parts.length === 2) {
      const name = parts[1]!;
      if (!NAME.test(name)) layout.problems.push(`${at(path)}: agent "${name}" must be lowercase words joined by dashes`);
      const d = exports["default"];
      if (kindOf(d) === "agent") layout.agents.set(name, { file: at(path), declaration: d as Agent });
      else if (kindOf(d) === "declared") layout.declared.set(name, { file: at(path), declaration: d as Declared });
      else layout.problems.push(`${at(path)}: the default export must be a Blueprint.agent or a Blueprint.declare`);
      continue;
    }
    if (parts[0] === "sources" && parts.length === 2) {
      const name = parts[1]!;
      const kinds = Object.entries(exports).filter(([, v]) => typeof v === "function" && kindOf(v) === "source-kind");
      if (kinds.length !== 1) layout.problems.push(`${at(path)}: must export exactly one Source.from or Source.timer`);
      else layout.sources.set(name, { file: at(path), declaration: kinds[0]![1] as SourceKind<any>, exportName: kinds[0]![0] });
      continue;
    }
    if (parts[0] === "values" && parts.length === 2) {
      for (const [k, v] of Object.entries(exports)) if (kindOf(v) === "value") layout.values.set(k, v as Value);
      continue;
    }
    if (parts[0] === "stores" && parts.length === 2) {
      const name = parts[1]!;
      if (!NAME.test(name)) layout.problems.push(`${at(path)}: store "${name}" must be lowercase words joined by dashes`);
      const d = exports["default"];
      if (kindOf(d) !== "store") layout.problems.push(`${at(path)}: the default export must be a Blueprint.store.<kind>()`);
      else layout.stores.set(name, { name, file: at(path), store: d as Store });
      continue;
    }
    if (parts[0] === "environments" && parts.length === 2) {
      const name = parts[1]!;
      if (!NAME.test(name)) layout.problems.push(`${at(path)}: environment "${name}" must be lowercase words joined by dashes`);
      const d = exports["default"];
      if (kindOf(d) !== "environment") layout.problems.push(`${at(path)}: the default export must be a Blueprint.environment`);
      else layout.environments.set(name, { file: at(path), declaration: d as Environment });
      continue;
    }
    if (parts[0] !== "things" || parts.length < 3) {
      layout.problems.push(`${at(path)}: not a place the blueprint reads (values/<file>.ts, environments/<name>.ts, stores/<name>.ts, things/<thing>/..., or a mount in features/, adapters/ or projections/)`);
      continue;
    }
    const name = parts[1]!;
    if (!NAME.test(name)) layout.problems.push(`${at(path)}: thing folder "${name}" must be lowercase words joined by dashes`);
    const t = thingFiles(name);
    const file = parts.slice(2).join("/");
    const each = (want: string) => Object.entries(exports).filter(([, v]) => kindOf(v) === want);
    if (file === "thing") {
      const found = each("thing");
      if (found.length !== 1) layout.problems.push(`${at(path)}: must export exactly one Blueprint.thing`);
      else t.thing = found[0]![1] as Thing;
    } else if (file === "machine") {
      const found = each("machine");
      if (found.length !== 1) layout.problems.push(`${at(path)}: must export exactly one Blueprint.machine`);
      else t.machine = found[0]![1] as Machine;
    } else if (file === "events") {
      for (const [k, v] of each("event")) t.events.set(k, v as Event);
    } else if (file === "errors") {
      for (const [k, v] of Object.entries(exports)) if (isErrorClass(v)) t.errors.set(k, v);
    } else if (file === "roles") {
      for (const [k, v] of each("role")) t.roles.set(k, v as Role);
    } else if (file === "problem") {
      const d = exports["default"];
      if (kindOf(d) !== "problem") layout.problems.push(`${at(path)}: the default export must be a Blueprint.problem`);
      else t.problem = { file: at(path), declaration: d as Problem };
    } else if (file === "holds") {
      for (const [k, v] of each("hold")) t.holds.set(k, { file: at(path), declaration: v as Hold });
    } else if (file === "derive") {
      // A derive is read through the reads that name it; the file only holds it.
    } else if (file === "invariants") {
      for (const [k, v] of each("invariant")) t.invariants.set(k, v as Unique);
    } else if (parts[2] === "verbs" && parts.length === 4) {
      const verb = parts[3]!;
      if (!NAME.test(verb)) layout.problems.push(`${at(path)}: verb "${verb}" must be lowercase words joined by dashes`);
      const d = exports["default"];
      const kind = kindOf(d);
      if (kind !== "operation" && kind !== "read") layout.problems.push(`${at(path)}: the default export must be a Blueprint.operation or a Blueprint.read`);
      else t.verbs.set(verb, { file: at(path), declaration: d as Operation | Read });
    } else {
      layout.problems.push(`${at(path)}: not a file a thing has (thing, machine, events, errors, roles, invariants, verbs/<verb>)`);
    }
  }
  for (const t of layout.things.values()) if (!t.thing) layout.problems.push(`${t.base}: has no thing.ts`);
  return layout;
};

/** `change-role` becomes `changeRole`; `allowance` becomes `Allowance` with `pascal`. */
export const camel = (name: string): string => name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
export const pascal = (name: string): string => camel(name).replace(/^[a-z]/, (c) => c.toUpperCase());
