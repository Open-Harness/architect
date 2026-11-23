// The lock that serializes building and publishing `orthograph` holds when it is stale and several workers race to reclaim it:
// real child processes plant, contend and log, and the log must never show two holders at once.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const contender = join(import.meta.dirname, "lock-contender.ts");
const CONTENDERS = 4;
const ROUNDS = 20;

/** A pid that is certainly dead: a child that has already exited. */
const deadPid = () => String(spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" }).stdout);

const run = (lock: string, log: string) => new Promise<number | null>((done) => {
  const child = spawn(process.execPath, [contender, lock, log, "40"], { stdio: "inherit" });
  child.on("exit", (code) => done(code));
});

it("a stale lock is reclaimed by one contender at a time and every contender finishes", async () => {
  for (let round = 0; round < ROUNDS; round++) {
    const dir = mkdtempSync(join(tmpdir(), "ortho-lock-test-"));
    const lock = join(dir, "lock");
    const log = join(dir, "log");
    mkdirSync(lock);
    writeFileSync(join(lock, `owner-${deadPid()}`), "");
    writeFileSync(log, "");
    const codes = await Promise.all(Array.from({ length: CONTENDERS }, () => run(lock, log)));
    const lines = readFileSync(log, "utf8").trim().split("\n");
    let holder: string | undefined;
    for (const line of lines) {
      const [what, pid] = line.split(" ") as ["enter" | "exit", string];
      if (what === "enter") { expect(holder, `round ${round}: ${pid} entered while ${holder} held the lock\n${lines.join("\n")}`).toBeUndefined(); holder = pid; }
      else { expect(holder, `round ${round}: ${pid} exited without holding`).toBe(pid); holder = undefined; }
    }
    expect(codes).toEqual(Array(CONTENDERS).fill(0));
    expect(lines.filter((l) => l.startsWith("enter"))).toHaveLength(CONTENDERS);
    expect(existsSync(lock), "the lock is released").toBe(false);
    expect(readdirSync(dir).sort(), "no tombstones left").toEqual(["log"]);
    rmSync(dir, { recursive: true, force: true });
  }
}, 120_000);
