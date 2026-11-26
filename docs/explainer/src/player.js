// The player: a clock (the narration's own, when there is sound), the controls, and the fit of the 1920 by 1080 stage into
// whatever box it is given. With window.__RENDER__ set it only builds the film and waits to be told which frame to draw.
(() => {
  const RENDER = !!window.__RENDER__, T = Film.T, $ = (id) => document.getElementById(id);
  const viewport = $("viewport"), stage = $("stage");
  if (RENDER) document.body.classList.add("render");
  const fit = () => { const w = viewport.clientWidth, h = viewport.clientHeight, k = Math.min(w / 1920, h / 1080); stage.style.transform = `translate(${(w - 1920 * k) / 2}px, ${(h - 1080 * k) / 2}px) scale(${k})`; };
  const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const faces = ['400 26px "IBM Plex Sans"', '500 26px "IBM Plex Sans"', '600 26px "IBM Plex Sans"', '400 22px "JetBrains Mono"', '500 22px "JetBrains Mono"', '700 22px "JetBrains Mono"', '500 20px "Barlow Condensed"', '600 20px "Barlow Condensed"'];

  let ctx = null, buffer = null, bytes = null, node = null, playing = false, offset = 0, startedAt = 0, wall = 0, dragging = false, captions = true;
  const now = () => (!playing ? offset : buffer ? offset + ctx.currentTime - startedAt : offset + (performance.now() - wall) / 1000);
  const stopNode = () => { if (node) { node.onended = null; try { node.stop(); } catch { /* not started */ } node = null; } };
  const startNode = () => { if (!buffer) { wall = performance.now(); return; } node = ctx.createBufferSource(); node.buffer = buffer; node.connect(ctx.destination); startedAt = ctx.currentTime; node.start(0, Math.min(offset, buffer.duration - 0.01)); };

  function paint(t) {
    const cur = Film.seek(t);
    if (RENDER) return;
    if (!dragging) $("scrub").value = t;
    $("time").textContent = `${clock(t)} / ${clock(T.total)}`;
    const line = Film.lineAt(t); $("caption").textContent = captions && line ? line.text : "";
    document.querySelectorAll("#chapters button").forEach((b, k) => b.classList.toggle("on", k === cur.index));
  }
  function loop() { if (!playing) return; let t = now(); if (t >= T.total) { pause(); t = T.total; offset = T.total; } paint(t); if (playing) requestAnimationFrame(loop); }
  async function play() {
    if (playing) return;
    if (offset >= T.total - 0.05) offset = 0;
    if (!ctx && bytes) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); buffer = await ctx.decodeAudioData(bytes.slice(0)); } catch { buffer = null; } }
    if (ctx && ctx.state === "suspended") { try { await ctx.resume(); } catch { /* stays silent */ } }
    playing = true; startNode(); $("play").textContent = "Pause"; $("bigplay").hidden = true; requestAnimationFrame(loop);
  }
  function pause() { if (!playing) return; offset = Math.min(T.total, now()); playing = false; stopNode(); $("play").textContent = "Play"; $("bigplay").hidden = false; }
  function jump(t) { const was = playing; if (was) { playing = false; stopNode(); } offset = Math.max(0, Math.min(T.total, t)); if (was) { playing = true; startNode(); requestAnimationFrame(loop); } else paint(offset); }

  function controls() {
    $("scrub").max = T.total;
    $("chapters").innerHTML = T.scenes.map((s) => `<li><button type="button" data-t="${s.start}">${Film.esc(s.title)} <span>${clock(s.start)}</span></button></li>`).join("");
    $("chapters").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) jump(+b.dataset.t + 0.02); });
    $("play").addEventListener("click", () => (playing ? pause() : play()));
    $("bigplay").addEventListener("click", (e) => { e.stopPropagation(); play(); });
    viewport.addEventListener("click", () => (playing ? pause() : play()));
    $("scrub").addEventListener("input", () => { dragging = true; jump(+$("scrub").value); });
    $("scrub").addEventListener("change", () => { dragging = false; });
    $("cc").addEventListener("click", () => { captions = !captions; $("cc").setAttribute("aria-pressed", String(captions)); $("caption").hidden = !captions; paint(now()); });
    $("full").addEventListener("click", () => { const go = document.fullscreenElement ? document.exitFullscreen() : viewport.requestFullscreen?.(); go?.catch?.(() => {}); });
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, button") && e.key === " ") return;
      if (e.key === " ") { e.preventDefault(); if (playing) pause(); else play(); } else if (e.key === "ArrowRight") jump(now() + 5); else if (e.key === "ArrowLeft") jump(now() - 5);
    });
    fetch("narration.mp3").then((r) => (r.ok ? r.arrayBuffer() : null)).then((a) => { bytes = a; }).catch(() => { bytes = null; });
  }

  Promise.all(faces.map((f) => document.fonts.load(f))).catch(() => {}).then(() => document.fonts.ready).then(() => {
    fit(); Film.build();
    if (RENDER) { window.__seek = (t) => { Film.seek(t); }; window.__total = T.total; window.__missed = Film.missed; } else { controls(); new ResizeObserver(fit).observe(viewport); document.addEventListener("fullscreenchange", fit); }
    paint(0); window.__ready = true;
  });
})();
