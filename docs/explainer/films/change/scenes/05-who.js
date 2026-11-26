// Sheet 5. The cast in a row, each over the one thing they change. Then what goes wrong, replayed: impact after a failed
// proof calls every operation unproven, and the next version needs a logbook. Then how each part stands.
Film.scene("who", {
  step: "who",
  html: (D) => {
    const ops = Chg.ops(D), now = Chg.impact(D.cap["change-impact"].out, ["stale", "proven"]), after = Chg.impact(D.cap["change-impact-after"].out, ["stale", "proven", "unproven"]);
    if (after.changed.length) throw new Error("who: the impact after the failed proof still names the change");
    Chg.need(after.unproven.length, ops.length, "e3 every operation unproven");
    if (!/^no logbook: /m.test(D.cap["change-version"].out)) throw new Error("who: the version recording does not ask for a logbook");
    ["journeys/claim-a-handle.ts", "src/link/add.ts", "blueprint/things/handle/invariants.ts"].forEach((f) => { if (D.src[f] === undefined) throw new Error("who: no file " + f); });
    const counts = { stale: `stale ${Chg.says(now.stale)} · proven ${Chg.says(now.proven)}`, unproven: `unproven ${Chg.says(after.unproven)} · proven ${Chg.says(after.proven)}` };
    const col = (k, kind, label, what, path) => `<div class="cast c${k}" style="left:${96 + k * 440}px"><div class="cw">${Kit.who(kind, label)}</div><div class="what">${what}</div><div class="path">${Film.esc(path)}</div></div>`;
    return `${Kit.css}${Chg.css("who")}<style>
      #scene-who .cast { position: absolute; top: 262px; width: 408px; height: 196px; padding: 18px 20px; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); }
      #scene-who .cast .what { margin-top: 14px; font-size: 28px; line-height: 1.2; font-weight: 500; } #scene-who .cast .path { margin-top: 10px; font-family: var(--mono); font-size: 19px; color: var(--cyan); overflow-wrap: anywhere; } #scene-who .cast.c0 .path { font-family: var(--sans); font-size: 22px; color: var(--text2); }
      #scene-who .story { left: 976px; top: 480px; width: 408px; padding: 14px 20px; border: 1.5px dashed var(--paper); font-size: 26px; line-height: 1.25; }
      #scene-who .story .lbl { margin-bottom: 6px; } #scene-who .climb { left: 1416px; top: 480px; width: 408px; }
      #scene-who #wh-imp .tag, #scene-who #wh-ver .tag { color: var(--muted); }
      #scene-who .stands { position: absolute; left: 96px; top: 500px; width: 1728px; height: 340px; }
      #scene-who .stands .kstand { font-size: 22px; } #scene-who .stands .kstand span { color: var(--text2); text-transform: none; letter-spacing: 0; font-family: var(--sans); font-size: 26px; font-weight: 400; }
      #scene-who .kstand b.staged { color: var(--paper); }
      #scene-who .red { left: 1240px; top: 560px; width: 584px; } #scene-who .red .say { font-size: 40px; }
      #scene-who .next { position: absolute; left: 1240px; top: 720px; display: flex; align-items: center; gap: 18px; }
      #scene-who .next .chip { font-family: var(--sans); font-size: 32px; padding: 12px 26px; border-color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">Who changes what</div><div class="hl">Each one changes one thing.</div></div>
    ${Chg.who([["agent", "your agent"]])}
    ${col(0, "you", "you", "decide what it should mean", "a person may hold more than one name")}
    ${col(1, "designer", "the designer", "takes the rule out", "blueprint/things/handle/invariants.ts")}
    ${col(2, "author", "the author", "changes the red step", "journeys/claim-a-handle.ts")}
    ${col(3, "builder", "the builder", "rewrites one handler", "src/link/add.ts")}
    <div class="abs story hidden0"><div class="lbl">the new story · it fails first</div>a person with two names adds a link</div>
    <div class="abs climb hidden0"><span class="chip">ortho brief link.add</span><div class="say" style="font-size:32px;margin-top:14px">and climb</div></div>
    ${Kit.term(D, { id: "wh-imp", cap: "change-impact-after", x: 96, y: 500, w: 1110, h: 250, size: 20, cls: "hidden0", tag: '<span class="tag">after the failed proof</span>' })}
    ${Kit.term(D, { id: "wh-ver", cap: "change-version", x: 1240, y: 500, w: 584, h: 250, size: 19, cls: "hidden0", tag: '<span class="tag">on a laptop</span>' })}
    <div class="stands hidden0">
      ${Kit.stand("real", "ortho impact · check · generate · prove", "left:0;top:0")}
      <div class="kstand" style="left:0;top:64px"><b class="staged">staged</b><span>the designer's edit, made by us · the stand-in handler</span></div>
      ${Kit.stand("missing", "the next version: no logbook here, so none was recorded", "left:0;top:128px")}
      <div class="sp hidden0">${Kit.stand("practice", "who changes what: nothing enforces it yet", "left:0;top:192px")}</div>
    </div>
    <div class="abs red hidden0"><div class="say">No author and no builder were filmed. This film stops at red.</div></div>
    <div class="next hidden0"><span class="lbl" style="font-size:28px">Next ·</span><span class="chip">more than one agent</span></div>
    ${Chg.band(D, "stale", counts)}`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3); s.in(".band", s.start + 0.4, { y: 0 });
    s.in(".cast", s.start + 0.5, { y: 14, stagger: 0.12 });
    // e1: the red step is the author's.
    s.to(".cast.c0, .cast.c1, .cast.c3", { opacity: 0.4, duration: 0.3 }, c("e1", "nobody"));
    s.to(".cast.c2", { borderColor: "#e9f0fa", duration: 0.3 }, c("e1", "author's"));
    s.in(".story", c("e1", "new story"), { y: 12 });
    // e2: only then a builder.
    s.to(".cast.c2", { opacity: 0.4, borderColor: "rgba(132,170,222,.36)", duration: 0.3 }, c("e2", "builder"));
    s.to(".cast.c3", { opacity: 1, borderColor: "#e9f0fa", duration: 0.3 }, c("e2", "builder"));
    s.in(".climb", c("e2", "brief"), { y: 12 }); s.in(".climb .say", c("e2", "climb"), { y: 8 });
    // e3: what goes wrong. Impact after a failed proof.
    const t3 = c("e3");
    s.out(".story, .climb", t3 - 0.3, { dur: 0.3 }); s.to(".cast", { opacity: 0.4, borderColor: "rgba(132,170,222,.36)", duration: 0.3 }, t3 - 0.3);
    Chg.act(s, 0, t3); s.in("#wh-imp", t3 + 0.1, { y: 14 });
    const it = Chg.type(s, s.$("#wh-imp"), c("e3", "After") - 0.2, 0.4); Chg.print(s, s.$$("#wh-imp .o"), Math.max(it + 0.1, c("e3", "impact")), 0.15);
    Chg.lit(s, "#wh-imp", Chg.rows(s, "#wh-imp", /^unproven /), c("e3", "unproven")); Chg.turn(s, "unproven", c("e3", "unproven"), 0.04);
    s.in(Chg.label(Chg.rows(s, "#wh-imp", /^stale none$/)[0], "the change is forgotten"), c("e3", "forgets"), { x: 14, y: 0, dur: 0.35 });
    // e4: the next version needs a logbook.
    s.in("#wh-ver", c("e4", "next version") - 0.1, { y: 14 });
    const vt = Chg.type(s, s.$("#wh-ver"), c("e4", "next version"), 0.5); Chg.print(s, s.$$("#wh-ver .o"), Math.max(vt + 0.1, c("e4", "logbook")), 0.15);
    // e5: how it stands.
    const t5 = c("e5");
    s.out("#wh-imp, #wh-ver", t5 - 0.3, { dur: 0.3 });
    s.in(".stands", t5 + 0.1, { y: 0, dur: 0.01 });
    const st = s.$$(".stands > .kstand"); s.in(st[0], t5 + 0.2, { x: 12, y: 0 }); s.in(st[1], c("e5", "edit"), { x: 12, y: 0 }); s.in(st[2], c("e5", "staged") + 0.6, { x: 12, y: 0 });
    s.in(".red", c("e5", "No author"), { y: 12 });
    // e6: the roles are practice. Next.
    s.in(".sp", c("e6", "practice"), { x: 12, y: 0 });
    s.to(".cast", { opacity: 1, duration: 0.4 }, c("e6", "roles"));
    s.in(".next", c("e6", "Next"), { y: 10 });
  },
});
