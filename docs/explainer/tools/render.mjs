// Draws the film frame by frame in a headless browser and encodes it: out/how-orthograph-works.mp4, with sound and captions.
// node tools/render.mjs [--fps 30] [--workers 4] [--from 0] [--to <seconds>] [--silent]
import { createRequire } from "node:module"; import { spawn, spawnSync } from "node:child_process"; import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"; import { join, resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");
const here = resolve(import.meta.dirname, ".."), out = join(here, "out"), tmp = join(out, "segments");
const arg = (name, fallback) => { const i = process.argv.indexOf("--" + name); return i < 0 ? fallback : process.argv[i + 1]; };
const fps = Number(arg("fps", 30)), workers = Number(arg("workers", 4)), silent = process.argv.includes("--silent");
const total = JSON.parse(readFileSync(join(out, "timing.json"), "utf8")).total, t0 = Number(arg("from", 0)), t1 = Number(arg("to", total));
const first = Math.round(t0 * fps), last = Math.ceil(t1 * fps), count = last - first;
const run = (args) => { const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" }); if (r.status !== 0) throw new Error("ffmpeg failed: " + args.join(" ")); };

const video = join(tmp, "video.mp4"), muxOnly = process.argv.includes("--mux-only");
if (!muxOnly) {
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  const started = Date.now(); let drawn = 0;
  const segment = async (k) => {
    const a = first + Math.floor((count * k) / workers), b = first + Math.floor((count * (k + 1)) / workers), file = join(tmp, `${String(k).padStart(2, "0")}.mp4`);
    const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => { window.__RENDER__ = true; });
    await page.goto("file://" + join(out, "film.html")); await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
    const cdp = await page.context().newCDPSession(page);
    const ffmpeg = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
      "-vf", "scale=in_range=full:out_range=tv:out_color_matrix=bt709", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-tune", "animation", "-pix_fmt", "yuv420p",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-g", String(fps * 2), "-r", String(fps), file], { stdio: ["pipe", "inherit", "inherit"] });
    const closed = new Promise((ok, no) => ffmpeg.on("close", (code) => (code === 0 ? ok() : no(new Error("ffmpeg exit " + code)))));
    for (let f = a; f < b; f++) {
      await page.evaluate((s) => window.__seek(s), f / fps);
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
      if (!ffmpeg.stdin.write(Buffer.from(data, "base64"))) await new Promise((r) => ffmpeg.stdin.once("drain", r));
      if (++drawn % 300 === 0) process.stdout.write(`\r${drawn}/${count} frames, ${(drawn / ((Date.now() - started) / 1000)).toFixed(1)} fps`);
    }
    ffmpeg.stdin.end(); await closed; await browser.close(); return file;
  };
  const files = await Promise.all(Array.from({ length: workers }, (_, k) => segment(k)));
  process.stdout.write(`\r${count} frames in ${((Date.now() - started) / 1000).toFixed(0)}s\n`);
  writeFileSync(join(tmp, "list.txt"), files.map((f) => `file '${f}'`).join("\n"));
  run(["-f", "concat", "-safe", "0", "-i", join(tmp, "list.txt"), "-c", "copy", video]);
}
const film = join(out, arg("name", "how-orthograph-works") + ".mp4");
if (silent || !existsSync(join(out, "narration.wav"))) run(["-i", video, "-c", "copy", "-movflags", "+faststart", film]);
else {
  // The voice, cleaned a little, over the pad. Then one gain for the whole film, measured, so the level never pumps.
  const sound = join(out, "sound.wav"), mixed = join(tmp, "mixed.wav"), pad = join(out, "pad.wav"), voice = "[0:a]aresample=48000,highpass=f=70,acompressor=threshold=-20dB:ratio=2.2:attack=8:release=140:makeup=2,pan=stereo|c0=c0|c1=c0[v]";
  run(existsSync(pad) ? ["-i", join(out, "narration.wav"), "-i", pad, "-filter_complex", `${voice};[v][1:a]amix=inputs=2:normalize=0[a]`, "-map", "[a]", mixed]
    : ["-i", join(out, "narration.wav"), "-filter_complex", `${voice};[v]anull[a]`, "-map", "[a]", mixed]);
  const heard = spawnSync("ffmpeg", ["-hide_banner", "-i", mixed, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const loud = Number(/I:\s+(-?[\d.]+) LUFS/.exec(heard.slice(heard.lastIndexOf("Summary")))[1]), gain = (-16 - loud).toFixed(2);
  run(["-i", mixed, "-af", `volume=${gain}dB,alimiter=limit=0.84:level=false`, sound]); console.log(`sound: ${loud} LUFS, gain ${gain} dB`);
  run(["-i", sound, "-c:a", "libmp3lame", "-b:a", "112k", join(out, "narration.mp3")]);
  const partial = t0 > 0 || t1 < total, cut = partial ? ["-ss", String(t0), "-t", String(t1 - t0)] : [];
  run(["-i", video, ...cut, "-i", sound, ...(partial ? [] : ["-i", join(out, "captions.srt")]), "-map", "0:v", "-map", "1:a", ...(partial ? [] : ["-map", "2:s", "-c:s", "mov_text", "-metadata:s:s:0", "language=eng"]),
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-metadata", "title=How Orthograph Works", film]);
}
console.log(film);
