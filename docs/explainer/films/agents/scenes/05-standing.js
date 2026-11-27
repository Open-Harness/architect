// Sheet 5. The lanes once more, with their claims. What goes wrong (nothing locks a path; a claim goes stale), what is
// practice, what was run (three plain shell recordings), what is missing (the factory, its row quoted), and the manual's
// spine from docs/manual/spine.json as the closing picture.
Film.scene("standing", {
  step: "standing",
  html: (D) => {
    const R = Agt.row(D, "gap-wide-things"), F = Agt.row(D, "work-factory");
    const paths = [...R.cell("Touches").matchAll(/`([^`]+)`/g)].map((m) => m[1]), goal = (/^goal-(\d+)$/.exec(R.cell("Lane")) ?? [])[1];
    if (!goal) throw new Error("standing: the quoted row has no goal in its lane");
    const spine = JSON.parse(D.repo["docs/manual/spine.json"]), chapters = spine.parts.flatMap((p) => p.chapters), last = chapters[chapters.length - 1];
    if (last.film !== "agents") throw new Error("standing: the narration says this is the manual's closing chapter; spine.json ends with " + last.film);
    const recs = ["agents-goals", "agents-claims", "agents-ratchets"].map((k) => { const r = D.cap[k]; if (!r) throw new Error("no recording " + k); return r.cmd; });
    const held = Object.fromEntries(D.cap["agents-claims"].out.split("\n").map((l) => { const m = /^ *(\d+) \| goal-(\d+) \|$/.exec(l); return [m[2], +m[1]]; }));
    return `${Kit.css}${Agt.css("standing")}<style>
      #scene-standing .up { position: absolute; left: 96px; top: 262px; width: 1728px; }
      #scene-standing #sd-row .code { padding: 10px 0; }
      #scene-standing .meet { position: absolute; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; color: var(--paper); padding: 4px 14px; border: 1.5px dashed var(--paper); background: #0b1727; white-space: nowrap; margin-top: -19px; }
      #scene-standing .unlk { position: absolute; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--text2); white-space: nowrap; }
      #scene-standing .stale { position: absolute; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); white-space: nowrap; padding: 3px 12px; border: 1.5px dashed var(--text2); background: #0b1727; }
      #scene-standing .say2 { font-size: 40px; line-height: 1.25; font-weight: 500; }
      #scene-standing .nocmd { display: flex; gap: 18px; margin-top: 26px; } #scene-standing .nocmd .chip { font-family: var(--sans); font-size: 30px; padding: 12px 24px; color: var(--text2); }
      #scene-standing .recs { margin-top: 20px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); padding: 14px 22px; }
      #scene-standing .recs div { font-family: var(--mono); font-size: 21px; line-height: 36px; color: var(--paper); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #scene-standing .recs div b { color: var(--cyan); font-weight: 400; margin-right: 12px; }
      #scene-standing .parts { display: grid; grid-template-columns: repeat(${spine.parts.length}, 1fr); gap: 22px; }
      #scene-standing .part .lbl { font-size: 21px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--rule2); }
      #scene-standing .ch { font-size: 24px; line-height: 38px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #scene-standing .ch b { font-family: var(--mono); font-weight: 400; color: var(--muted); display: inline-block; width: 2.9ch; }
      #scene-standing .ch.this { color: var(--paper); } #scene-standing .ch.this b { color: var(--cyan); }
      #scene-standing .nextslot { margin-top: 4px; height: 36px; border: 1.5px dashed var(--rule2); display: flex; align-items: center; padding: 0 12px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 20px; font-weight: 600; color: var(--muted); }
      #scene-standing .copy { position: absolute; left: 96px; top: 608px; display: flex; align-items: center; gap: 18px; }
      #scene-standing .copy .chip { font-family: var(--sans); font-size: 30px; padding: 10px 24px; border-color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">Standing</div><div class="hl">Practice, and what is missing.</div></div>
    <div class="who">${Kit.who("you")}</div>
    <div class="up u1">${Agt.ed(D, { id: "sd-row", path: "docs/canon/status.md", x: 0, y: 0, w: 1728, from: R.n, to: R.n, tag: '<span class="tag">a claim: a cell in a table</span>' })}</div>
    <div class="up u2 hidden0" style="top:480px"><div class="say2">Nothing locks the paths.</div><div class="say2 mu u2b hidden0" style="margin-top:14px">Two agents can still meet in one file.</div></div>
    <div class="up u2s hidden0" style="top:480px"><div class="say2">A claim can go stale.</div><div class="say2 mu" style="margin-top:14px">A goal stops, and its lane stays set.</div></div>
    <div class="up u3 hidden0"><div class="say2">Everything you watched is this repository's practice.</div>
      <div class="nocmd"><span class="lbl" style="align-self:center;font-size:24px">no ortho command</span><span class="chip n1 hidden0">claims work</span><span class="chip n2 hidden0">settles a collision</span><span class="chip n3 hidden0">keeps a list</span></div></div>
    <div class="up u4 hidden0"><div class="say2">Nothing here was run on Plugged In.</div>
      <div class="recs hidden0"><div class="lbl" style="margin-bottom:6px">the three recordings, plain shell, read at the repository's root</div>${recs.map((r) => `<div><b>$</b>${Film.esc(r)}</div>`).join("")}</div></div>
    <div class="up u5 hidden0">${Agt.ed(D, { id: "sd-fac", path: "docs/canon/status.md", x: 0, y: 0, w: 1728, from: F.h, to: F.h })}${Agt.ed(D, { id: "sd-fac2", path: "docs/canon/status.md", x: 0, y: 124, w: 1728, from: F.n, to: F.n, tag: '<span class="tag">the factory</span>' })}</div>
    <div class="up u6 hidden0"><div class="parts">${spine.parts.map((p) => `<div class="part"><div class="lbl">${Film.esc(p.title)}</div>${p.chapters.map((ch) => `<div class="ch${ch === last ? " this" : ""}"><b>${ch.n}</b>${Film.esc(ch.title)}</div>`).join("")}${p === spine.parts[spine.parts.length - 1] ? '<div class="nextslot hidden0">no chapter after this one</div>' : ""}</div>`).join("")}</div></div>
    <div class="copy hidden0"><span class="lbl" style="font-size:24px">what you can copy today</span><span class="chip k1 hidden0">one file of claims</span><span class="chip k2 hidden0">one rule</span><span class="chip k3 hidden0">one list that only shrinks</span></div>
    ${Agt.lanes(D, {
      fill: (g) => (g.n === goal ? paths.map((p, k) => `<span class="piece folder f${k}">${Film.esc(p)}</span>`).join("") : ""),
      dest: (g) => `<div class="badge">${held[g.n] ? `${held[g.n]} claim${held[g.n] > 1 ? "s" : ""}` : "none"}</div>`,
    })}
    <div class="meet m1 hidden0">two agents, one file: a merge conflict</div>
    <div class="stale s1 hidden0">its lane still says goal-${goal}</div>
    <div class="stands">
      ${Kit.stand("practice", "claims", "left:96px;top:690px").replace('class="kstand"', 'class="kstand p1 hidden0"')}
      ${Kit.stand("practice", "the collision rule", "left:600px;top:690px").replace('class="kstand"', 'class="kstand p2 hidden0"')}
      ${Kit.stand("practice", "the list that only shrinks", "left:1180px;top:690px").replace('class="kstand"', 'class="kstand p3 hidden0"')}
      ${Kit.stand("missing", "the factory: designed, not built", "left:96px;top:992px").replace('class="kstand"', 'class="kstand ms hidden0"')}
    </div>`;
  },
  build(s) {
    const c = s.cue, D = s.D, R = Agt.row(D, "gap-wide-things"), F = Agt.row(D, "work-factory"), root = s.el, goal = (/^goal-(\d+)$/.exec(R.cell("Lane")))[1];
    if (F.cell("Lane") !== "none") throw new Error("standing: the factory row is claimed; the narration says it is not built");
    const line = s.$("#sd-row .ln code"), cLane = Agt.mark(line, R.cell("Lane")), cTouch = Agt.mark(line, R.cell("Touches"));
    const fh = s.$("#sd-fac .ln code"), fr = s.$("#sd-fac2 .ln code"), fStage = Agt.mark(fh, "Stage"), fSp = Agt.mark(fr, F.cell("Stage")), fName = Agt.mark(fr, F.cell("Item"));
    const k16 = Agt.at(D, goal), kJ = Agt.at(D, 18), lane16 = s.$(".lane-" + goal);
    const comp = s.$(".lane-" + goal + " .folder.f1"), cp = Agt.pos(comp, root);
    const meet = s.$(".m1"); meet.style.left = (cp.x - 160) + "px"; meet.style.top = Agt.mid(kJ) + "px";
    const unlk = s.$(".u2");
    const stale = s.$(".s1"); stale.style.left = "360px"; stale.style.top = (Agt.mid(k16) - 19) + "px";

    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(".lane", s.start + 0.4, { x: -12, y: 0, stagger: 0.08 });
    // t1: a claim is a cell; nothing locks the paths; two agents meet in one file.
    s.in(".u1", c("t1", "claim"), { y: 12 }); Agt.glow(s, cLane, c("t1", "cell")); Agt.glow(s, cTouch, c("t1", "Nothing"));
    s.in(unlk, c("t1", "locks"), { y: 6 });
    s.to(comp, { borderColor: "#e9f0fa", duration: 0.3 }, c("t1", "two agents"));
    s.in(".u2b", c("t1", "two agents"), { y: 8 }); s.in(meet, c("t1", "meet"), { x: 14, y: 0 });
    // t2: a claim goes stale: the goal stops and its lane stays set.
    s.out(meet, c("t2") - 0.2, { dur: 0.25 }); s.out(unlk, c("t2") - 0.2, { dur: 0.25 });
    s.to(lane16.querySelector(".kwho"), { opacity: 0.3, duration: 0.4 }, c("t2", "stops")); s.to(lane16.querySelector(".kind"), { opacity: 0, duration: 0.3 }, c("t2", "stops")); s.to(lane16.querySelector(".slots"), { opacity: 0.3, duration: 0.4 }, c("t2", "stops"));
    s.in(".u2s", c("t2", "stale"), { y: 8 }); s.in(stale, c("t2", "leaves"), { x: 10, y: 0 }); Agt.glow(s, cLane, c("t2", "lane"), "rgba(233,240,250,.35)");
    // t3: practice, all of it; no command does it.
    const t3 = c("t3");
    s.out(".u1, .s1, .u2s", t3 - 0.3, { dur: 0.3 }); s.to(lane16.querySelector(".kwho"), { opacity: 1, duration: 0.3 }, t3); s.to(lane16.querySelector(".kind"), { opacity: 1, duration: 0.3 }, t3); s.to(lane16.querySelector(".slots"), { opacity: 1, duration: 0.3 }, t3);
    s.in(".u3", c("t3", "everything"), { y: 12 }); s.in(".p1, .p2, .p3", c("t3", "practice"), { y: 8, stagger: 0.2 });
    s.in(".n1", c("t3", "claims"), { y: 8 }); s.in(".n2", c("t3", "settles"), { y: 8 }); s.in(".n3", c("t3", "keeps"), { y: 8 });
    // t4: nothing ran on Plugged In; three files read with plain shell.
    s.out(".u3", c("t4") - 0.3, { dur: 0.3 }); s.in(".u4", c("t4"), { y: 12 }); s.in(".recs", c("t4", "read"), { y: 10 });
    // t5: the factory: its row, spiked, no lane.
    s.out(".u4", c("t5") - 0.3, { dur: 0.3 }); s.in(".u5", c("t5", "factory"), { y: 12 });
    Agt.glow(s, fName, c("t5", "board")); Agt.glow(s, fStage, c("t5", "designed")); Agt.glow(s, fSp, c("t5", "designed"));
    s.in(".ms", c("t5", "not built"), { y: 0 });
    // t6: the manual's spine: this is the last chapter; then what you can copy.
    s.out(".u5", c("t6") - 0.3, { dur: 0.3 }); s.in(".u6", c("t6", "manual's"), { y: 12 });
    s.in(".nextslot", c("t6", "nothing"), { y: 6 });
    s.in(".copy", c("t6", "copy"), { y: 8 }); s.in(".k1", c("t6", "file"), { y: 8 }); s.in(".k2", c("t6", "rule"), { y: 8 }); s.in(".k3", c("t6", "list"), { y: 8 });
  },
});
