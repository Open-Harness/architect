// Makes the films the manual's page plays, from the renders: node docs/manual/films.mjs
// For each film in spine.json whose render exists (docs/explainer/out/<film>/<film>.mp4, made by docs/explainer/tools/render.mjs),
// it writes site/films/<film>.mp4 (720p, small enough to commit), <film>.jpg (a poster from a third of the way in) and
// <film>.captions.txt (the film's captions as WebVTT, kept as text because an artifact does not serve .vtt). Needs ffmpeg.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const here = import.meta.dirname, renders = resolve(here, "../explainer/out"), out = join(here, "site/films");
const spine = JSON.parse(readFileSync(join(here, "spine.json"), "utf8"));
const films = [spine.opening.film, ...spine.parts.flatMap((p) => p.chapters.map((c) => c.film))];
const ff = (args) => { const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" }); if (r.status !== 0) throw new Error("ffmpeg failed: " + args.join(" ")); };
mkdirSync(out, { recursive: true });
for (const film of films) {
  const src = join(renders, film, `${film}.mp4`), mp4 = join(out, `${film}.mp4`);
  if (!existsSync(src)) { console.log(`${film}: no render, skipped`); continue; }
  if (!existsSync(mp4) || statSync(mp4).mtimeMs < statSync(src).mtimeMs) {
    ff(["-i", src, "-vf", "scale=1280:720", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-tune", "animation", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-sn", "-movflags", "+faststart", mp4]);
  }
  const total = JSON.parse(readFileSync(join(renders, film, "timing.json"), "utf8")).total;
  ff(["-ss", String((total / 3).toFixed(2)), "-i", src, "-frames:v", "1", "-vf", "scale=1280:720", "-q:v", "4", join(out, `${film}.jpg`)]);
  const srt = readFileSync(join(renders, film, "captions.srt"), "utf8").replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2");
  writeFileSync(join(out, `${film}.captions.txt`), "WEBVTT\n\n" + srt);
  console.log(`${film}: ${(statSync(mp4).size / 1e6).toFixed(1)} MB`);
}
