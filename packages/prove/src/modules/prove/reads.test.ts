// L2.04: a read that lists, on a real world (workerd, D1, the generated server). `where`, `order` and `page` work, roles are
// enforced as for any read, and every eval covers it.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { FsTree, flushChanges } from "nx/src/generators/tree.js";
import { Sync } from "@orthograph/generators/sync";
import { Owned } from "@orthograph/services";
import { Prove } from "./service.ts";

const visible = (from: string) => !basename(from).startsWith(".");
const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const fixtures = join(acme, "test/fixtures/layer2/list-read");
const scratch = join(acme, "test/tmp/reads");
const PORT = 0;

/** A copy of acme with `list.ts` and the journeys written, generated/ synced from them. */
const project = (name: string, list: { readonly from: string } | { readonly text: string }, journeys: Readonly<Record<string, string>>) =>
  Effect.runPromise(Effect.gen(function* () {
    const root = join(scratch, name, "acme");
    rmSync(join(scratch, name), { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
    writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")) }));
    if ("from" in list) cpSync(join(fixtures, list.from), join(root, "blueprint/things/allowance/verbs/list.ts"));
    else writeFileSync(join(root, "blueprint/things/allowance/verbs/list.ts"), list.text);
    for (const [file, text] of Object.entries(journeys)) writeFileSync(join(root, "journeys", file), text);
    const tree = new FsTree(repo, false);
    yield* Sync.project(tree, relative(repo, root));
    flushChanges(repo, tree.listChanges());
    return root;
  }));

const prove = (root: string) => Effect.runPromise(Effect.scoped(Prove.run({ root, port: PORT })));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** Three allowances in the funded world's organisation: olga's, then bob's, then bea's. Two to a page, oldest first. */
const PAGING = `import { Blueprint, expect, refuses } from "orthograph";
import { owner } from "../blueprint/things/organization/roles.ts";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import grant from "../blueprint/things/allowance/verbs/grant.ts";
import list from "../blueprint/things/allowance/verbs/list.ts";

export default Blueprint.journey("a list pages through the allowances in order", {
  cast: { ada: owner, olga: grantee, bob: Blueprint.signedIn, bea: Blueprint.signedIn },
  starts: "funded",
  steps: (s) => [
    s.step("ada grants bob", s.ada.run(grant, { organization: s.world.organization, member: s.bob.person, limit: 100n })),
    s.step("ada grants bea", s.ada.run(grant, { organization: s.world.organization, member: s.bea.person, limit: 200n })),
    s.step(
      "the first page holds the two oldest, and a cursor",
      s.ada.run(list, { organization: s.world.organization }),
      expect((p) => p.items.map((i: { member: string }) => i.member)).toEqual([s.olga.person, s.bob.person]),
      expect((p) => p.next).toMatch(/^[0-9]+$/),
    ),
    s.step(
      "the cursor gives the page after it, and then no more",
      s.ada.run(list, { organization: s.world.organization, cursor: s.last.next }),
      expect((p) => p.items.map((i: { member: string }) => i.member)).toEqual([s.bea.person]),
      expect((p) => p.next).toBe(null),
    ),
    s.step(
      "a filter narrows it",
      s.ada.run(list, { organization: s.world.organization, member: s.bob.person }),
      expect((p) => p.items.map((i: { limit: bigint }) => i.limit)).toEqual([100n]),
    ),
    s.step(
      "a state nobody is in is an empty page",
      s.ada.run(list, { organization: s.world.organization, state: "revoked" }),
      expect((p) => p.items.length).toBe(0),
    ),
    s.step("someone who is not the owner is refused", s.bob.run(list, { organization: s.world.organization }), refuses(Blueprint.NotAllowed)),
    s.step("no organisation named is refused too", s.ada.run(list, {}), refuses(Blueprint.NotAllowed)),
  ],
});
`;

const SMALL_LIST = `import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { owner } from "../../organization/roles.ts";

export default Blueprint.read(Allowance, {
  where: ["organization", "member", "state"],
  order: "oldest",
  page: 2,
  allowed: [owner.of("organization")],
  budget: { p95: "100 millis" },
});
`;

describe("a read that lists, on a real world", () => {
  // These include generation and workerd startup plus every journey. CI's cold services once exceeded 240 s;
  // use the integration-test budget, without changing any operation's performance eval or its declared budget.
  it("the author's allowance.list passes every eval, and its journey's answers are pages", { timeout: 600_000 }, async () => {
    const root = await project("authors", { from: "list.ts" }, { "an-owner-lists-allowances.ts": readFileSync(join(fixtures, "an-owner-lists-allowances.ts"), "utf8") });
    const report = await prove(root);
    expect(report.lines.filter((l) => l.includes("✘")), report.lines.join("\n")).toEqual([]);
    expect(report.lines).toContain("journey an owner lists allowances ✔ 3/3 steps");
    expect(report.lines.some((l) => l.startsWith("allowance.list 9 evals ✔ p50 "))).toBe(true);
    expect(report.lines.at(-1)).toBe("prove ✔");
    expect(Owned.leaks().filter((m) => m.owner === process.pid)).toEqual([]);
  });

  it("filters, orders and pages, and refuses who is not the owner", { timeout: 600_000 }, async () => {
    const root = await project("paging", { text: SMALL_LIST }, { "a-list-pages.ts": PAGING });
    const report = await prove(root);
    expect(report.lines.filter((l) => l.includes("✘")), report.lines.join("\n")).toEqual([]);
    expect(report.lines).toContain("journey a list pages through the allowances in order ✔ 8/8 steps");
    expect(report.lines.some((l) => l.startsWith("allowance.list 9 evals ✔"))).toBe(true);
    expect(report.passed).toBe(true);
  });
});
