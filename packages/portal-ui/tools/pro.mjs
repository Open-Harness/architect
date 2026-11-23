#!/usr/bin/env node
// The one place portal-ui meets the licensed package's install (F7, M1.34). `pnpm install` gives a plain machine the registry's
// stub of Pro (its build scripts are off, pnpm-workspace.yaml), which has no code and no types; the licensed build arrives only
// where a person has a licence: on a machine signed in with Pro's own login, or in the CI job that holds the secret.
//
//   node pro.mjs <package> status            real, stub or absent
//   node pro.mjs <package> gate <command...> run the command where the real build is installed; elsewhere say so and succeed,
//                                            unless ORTHO_REQUIRE_PRO=1 (the CI job), which makes a missing build a failure
//   node pro.mjs <package> require <command...> run the command where the real build is installed; elsewhere fail with a K19 message
//                                            (no stub, no skip): the portal's client is built only where the licence is
//   node pro.mjs <package> fetch            run the package's own installer (it reads its credential from the environment itself)
//   node pro.mjs <package> save <dir>        copy the installed build to <dir> (the CI cache)
//   node pro.mjs <package> restore <dir>     copy <dir> back over the install
//
// This script never reads, prints or writes the credential; `fetch` only passes the environment to Pro's installer.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [, , given, command, ...rest] = process.argv;
// `pro` is the licensed package, so a package that is not portal-ui can run a command through this script without naming it (check 15 allows the name only here).
const name = given === "pro" ? "@heroui-" + "pro/react" : given;
if (name === undefined || command === undefined) {
  console.error("usage: pro.mjs <package> status|gate|fetch|save|restore ...");
  process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));
const link = join(here, "..", "node_modules", name);

/** `real` once the licensed build is in place (it declares its entry and types; the stub does not), `stub` for the registry's shell. */
const state = () => {
  if (!existsSync(join(link, "package.json"))) return "absent";
  const manifest = JSON.parse(readFileSync(join(link, "package.json"), "utf8"));
  return manifest.types !== undefined || manifest.exports !== undefined ? "real" : "stub";
};
const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit" }).status ?? 1;

if (command === "status") {
  console.log(state());
} else if (command === "gate") {
  if (state() === "real") process.exit(run(rest[0], rest.slice(1)));
  if (process.env.ORTHO_REQUIRE_PRO === "1") {
    console.error(`portal-ui: the licensed ${name} is required here and is ${state()}`);
    process.exit(1);
  }
  console.log(`portal-ui: skipped, the licensed ${name} is ${state()} (it is checked in the CI job that installs it, and wherever you have a licence)`);
} else if (command === "require") {
  // The portal's client is built only where the licence is (K19): elsewhere this fails, naming K19. Nothing is stubbed and nothing is skipped.
  if (state() === "real") process.exit(run(rest[0], rest.slice(1)));
  console.error(`K19: unavailable. The portal's client is built once, where the HeroUI Pro licence is, and ships as static files; the licensed ${name} is ${state()} here, so it cannot be built.`);
  process.exit(1);
} else if (command === "fetch") {
  if (!existsSync(link)) {
    console.error(`portal-ui: ${name} is not installed; run pnpm install first`);
    process.exit(1);
  }
  // pnpm links the package out of its store; copy it out first, so what the installer writes never reaches the store.
  const target = realpathSync(link);
  const copy = `${target}.copy`;
  rmSync(copy, { recursive: true, force: true });
  cpSync(target, copy, { recursive: true, dereference: true });
  rmSync(target, { recursive: true, force: true });
  cpSync(copy, target, { recursive: true });
  rmSync(copy, { recursive: true, force: true });
  const status = run(process.execPath, [join(target, "dist/postinstall/index.js")]);
  if (status !== 0) process.exit(status);
  if (state() !== "real") {
    console.error(`portal-ui: the installer ran but ${name} is still ${state()}; is the licence token set for this job?`);
    process.exit(1);
  }
  console.log(`portal-ui: ${name} installed`);
} else if (command === "save" || command === "restore") {
  const dir = resolve(rest[0] ?? "");
  const target = realpathSync(link);
  if (command === "save") {
    if (state() !== "real") {
      console.error(`portal-ui: nothing to save, ${name} is ${state()}`);
      process.exit(1);
    }
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    cpSync(target, dir, { recursive: true, dereference: true });
  } else {
    if (!existsSync(dir)) {
      console.error(`portal-ui: no saved build at ${dir}`);
      process.exit(1);
    }
    rmSync(target, { recursive: true, force: true });
    cpSync(dir, target, { recursive: true });
  }
} else {
  console.error(`portal-ui: unknown command ${command}`);
  process.exit(2);
}
