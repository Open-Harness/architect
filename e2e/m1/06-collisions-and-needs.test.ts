// Check 06 (M1.08): every refusal of M1-plugins section 12, each after a successful control, each asserting a non-zero
// exit, a diagnostic and BOTH sides of the clash (the app's file and the package's path, or two mount files); and needs,
// met and unmet. Two more refusals of section 12 live in check 08: an empty `via`, and `omit` or `narrow` of an
// operation that is not the plugin's.
//
// Assumptions beyond M1-plugins: the refusals come from `ortho check`, as section 12's title says (a missing handler module
// from `ortho generate`, as section 8 says); "both sides" is the mount file plus the package path (`@fixture/echo`) plus
// the app's own declaration file where the clash is with the app; the unmet-need message carries the command to mount it.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installFixture, mountEcho, model, project, refuses, removeAt, run, succeeds, textAt, writeMount, type Copy, type Entry } from "./support.ts";

const copies: Array<Copy> = [];
const fresh = (...kinds: Array<Entry>) => { const copy = project(...kinds); copies.push(copy); return copy; };
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const ECHO = "blueprint/features/echo.ts";
const GREET = "blueprint/features/greet.ts";
const mountGreet = (root: string, verbs: ReadonlyArray<string> = []) => writeMount(root, "feature", "greet", { pkg: "@fixture/greet", verbs });

/** An echo mounted and valid: the control every refusal below follows. */
const selected = () => {
  const copy = fresh("echo");
  mountEcho(copy.root);
  expect(Object.keys(model(copy.root).operations)).toContain("echo.repeat");
  return copy;
};
/** The same project with the installed package replaced by a variant of itself: only the package differs. */
const withVariant = (copy: Copy, kind: string, variant: string) => installFixture(copy.root, kind, { variant });

describe("06 collisions: a clean mounted project checks (the control)", () => {
  it("echo and greet mounted together check, and their needs are recorded", () => {
    const { root } = fresh("echo", "greet");
    mountEcho(root);
    mountGreet(root);
    const got = model(root);
    expect(got.mounts?.["greet"]?.needs).toEqual(["feature:echo"]);
    expect(got.mounts?.["echo"]?.needs ?? []).toEqual([]);
    expect(Object.keys(got.operations)).toEqual(expect.arrayContaining(["echo.repeat", "greet.hello"]));
    succeeds(root, "generate");
    const checked = run(root, "check");
    expect(checked.status, checked.out).toBe(0);
  });
});

describe("06 collisions: names, codes and tags", () => {
  it("a plugin thing named like an app thing is refused, naming the mount, the package and the app's thing", () => {
    const copy = selected();
    withVariant(copy, "echo", "name-clash-thing");
    refuses(copy.root, ["check"], /allowance|clash|already|twice|duplicate|same name/i, [ECHO, "@fixture/echo", "blueprint/things/allowance"]);
  });

  it("two plugins with a thing of one name are refused, naming both mounts", () => {
    const copy = fresh("echo", "greet");
    mountEcho(copy.root);
    mountGreet(copy.root);
    succeeds(copy.root, "model", "--json");
    installFixture(copy.root, "greet", { variant: "name-clash-echo" });
    refuses(copy.root, ["check"], /echo|clash|already|twice|duplicate|same name/i, [ECHO, GREET, "@fixture/greet", "@fixture/echo"]);
  });

  it("a refusal named like the app's refusal is refused", () => {
    const copy = selected();
    withVariant(copy, "echo", "refusal-name-clash");
    refuses(copy.root, ["check"], /AllowanceExceeded/, [ECHO, "@fixture/echo", "blueprint/things/allowance/errors.ts"]);
  });

  it("a plugin thing with the app's code prefix is refused", () => {
    const copy = selected();
    withVariant(copy, "echo", "code-prefix-clash");
    refuses(copy.root, ["check"], /prefix|code/i, ["AL", ECHO, "@fixture/echo", "blueprint/things/allowance/thing.ts"]);
  });

  it("a plugin thing using AR, which the runtime reserves, is refused", () => {
    const copy = selected();
    withVariant(copy, "echo", "reserved-prefix");
    refuses(copy.root, ["check"], /reserved|runtime/i, ["AR", ECHO, "@fixture/echo"]);
  });

  it("two error classes with one tag in an operation's union are refused", () => {
    const copy = selected();
    withVariant(copy, "echo", "ambiguous-tags");
    refuses(copy.root, ["check"], /ambiguous|tag|union/i, ["EchoProblem", ECHO, "@fixture/echo", "echo.repeat"]);
  });

  it("a thing folder or a verb file whose name is not lowercase words with dashes is refused, naming the package", () => {
    for (const [variant, name] of [["invalid-thing-folder", "Bad_Thing"], ["invalid-verb-name", "Bad_Verb"]] as const) {
      const copy = selected();
      withVariant(copy, "echo", variant);
      refuses(copy.root, ["check"], /lowercase|dash|name/i, [name, "@fixture/echo"]);
    }
  });

  it("a server operation with no handler module is refused at generate, naming the operation, the package and the worker", () => {
    const copy = selected();
    succeeds(copy.root, "generate");
    withVariant(copy, "echo", "no-handler");
    refuses(copy.root, ["generate"], /handler|missing/i, ["echo.shout", "@fixture/echo", "worker"]);
  });
});

describe("06 collisions: mounts", () => {
  it("one descriptor mounted twice is refused, naming both files", () => {
    const copy = selected();
    writeFileSync(join(copy.root, "blueprint/features/again.ts"), textAt(copy.root, ECHO));
    refuses(copy.root, ["check"], /twice|once|already|duplicate/i, [ECHO, "blueprint/features/again.ts", "@fixture/echo"]);
  });

  for (const bad of ["Bad_Name", "1starts-with-digit", "double--dash"]) {
    it(`a mount named ${bad} is refused, naming its file`, () => {
      const copy = selected();
      removeAt(copy.root, ECHO);
      mountEcho(copy.root, { name: bad });
      refuses(copy.root, ["check"], /name|lowercase|dash/i, [`blueprint/features/${bad}.ts`]);
    });
  }

  it("an option of another plugin is refused, naming the mount", () => {
    const copy = fresh("echo", { kind: "greet", variant: "when" });
    mountEcho(copy.root);
    succeeds(copy.root, "model", "--json");
    mountEcho(copy.root, { pick: "plain", verbs: ["p.choose(other.choices.mode.echoing)"], imports: ['import other from "@fixture/greet";'] });
    refuses(copy.root, ["check"], /choose|choice|option|another|not (?:one )?of/i, [ECHO, "@fixture/greet"]);
  });
});

describe("06 needs", () => {
  it("a need that is not mounted is refused, naming the package and the command to mount it", () => {
    const copy = fresh("echo", "greet");
    mountEcho(copy.root);
    mountGreet(copy.root);
    succeeds(copy.root, "model", "--json");
    removeAt(copy.root, ECHO);
    refuses(copy.root, ["check"], /needs|isn't mounted|not mounted/i, [GREET, "@fixture/echo", "ortho add feature @fixture/echo"]);
    refuses(copy.root, ["model", "--json"], /needs|isn't mounted|not mounted/i, [GREET, "@fixture/echo"]);
  });

  it("a need with `when` applies only when its option is picked", () => {
    const copy = fresh("echo", { kind: "greet", variant: "when" });
    // The default pick does not echo: greet is fine alone.
    mountGreet(copy.root);
    expect(model(copy.root).mounts?.["greet"]?.chosen).toEqual({ mode: "plain" });
    expect(model(copy.root).mounts?.["greet"]?.needs ?? []).toEqual([]);
    // Picking the option that echoes brings the need in, and nothing meets it yet.
    mountGreet(copy.root, ["p.choose(p.choices.mode.echoing)"]);
    refuses(copy.root, ["check"], /needs|isn't mounted|not mounted/i, [GREET, "@fixture/echo", "ortho add feature @fixture/echo"]);
    // Mounted beside the echo, the same pick is met.
    mountEcho(copy.root);
    const got = model(copy.root);
    expect(got.mounts?.["greet"]).toMatchObject({ chosen: { mode: "echoing" }, needs: ["feature:echo"] });
    succeeds(copy.root, "generate");
    const checked = run(copy.root, "check");
    expect(checked.status, checked.out).toBe(0);
  });
});
