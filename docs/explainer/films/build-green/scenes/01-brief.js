// Sheet 1. One brief for one handler: `ortho brief handle.claim`, replayed, and its five parts lit as they are named.
Film.scene("brief", {
  step: "brief",
  html: (D) => {
    const out = D.cap["brief"].out.split("\n");
    ["Read", "Do", "Don't touch", "Done when"].forEach((w) => { if (!out.includes(w)) throw new Error("brief: the recording has no section " + w); });
    if (!out.some((l) => /^Write\s+src\/handle\/claim\.ts/.test(l))) throw new Error("brief: the recording has no Write line");
    // The echo of the command, the blank lines and the one long paragraph under Do are left out so the rest is readable.
    const keep = (l) => l !== "" && !/^brief /.test(l) && !/^  a database step wraps/.test(l);
    return `${Kit.css}${Loc.css("brief")}<style>
      #scene-brief #bf-red { z-index: 1; } #scene-brief .redlab { left: 1040px; top: 300px; width: 700px; }
      #scene-brief #bf .screen { line-height: 26px !important; padding: 12px 22px; }
      #scene-brief #bf .o.sect { margin-top: 7px; color: var(--paper); }
      #scene-brief .hand { left: 1150px; width: 620px; padding: 22px 28px 26px; border: 1.5px solid var(--paper); background: #0b1727; box-shadow: 0 24px 60px -20px rgba(0,0,0,.9); }
      #scene-brief .hand .pair { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; } #scene-brief .hand .pair i { font-style: normal; font-size: 30px; color: var(--muted); }
    </style>
    <div class="head"><div class="eyebrow">The brief</div><div class="hl">One operation. One brief.</div></div>
    <div class="who">${Kit.who("you")}<span class="arrow hidden0">→</span><span class="to hidden0">${Kit.who("builder", "the builder")}</span></div>
    ${Kit.term(D, { id: "bf-red", cap: "prove-empty", x: 96, y: 262, w: 900, h: 340, keep: (l) => l.startsWith("journey "), tag: '<span class="tag">handlers still empty</span>' })}
    <div class="abs redlab hidden0"><div class="say">The journeys are agreed.<br>They are red.</div><div class="say mu now hidden0" style="margin-top:26px">Now someone builds.</div></div>
    ${Kit.term(D, { id: "bf", cap: "brief", x: 96, y: 250, w: 1728, h: 728, size: 19, keep, cls: "hidden0" })}
    <div class="abs hand hidden0"><div class="pair">${Kit.who("you")}<i>→</i>${Kit.who("builder", "the builder")}</div><div class="say" style="font-size:40px">Hand it over exactly as printed.</div></div>`;
  },
  build(s) {
    const c = s.cue, rows = s.$$("#bf .o"), at = (re) => { const k = rows.findIndex((o) => re.test(o.textContent)); if (k < 0) throw new Error("brief: no printed line " + re); return k; };
    const iWrite = at(/^Write\s/), iRead = at(/^Read$/), iDo = at(/^Do$/), iDont = at(/^Don't touch$/), iDone = at(/^Done when$/);
    [iWrite, iRead, iDo, iDont, iDone].forEach((k) => rows[k].classList.add("sect"));
    const block = { write: rows.slice(iWrite, iRead), read: rows.slice(iRead, iDo), todo: rows.slice(iDo, iDont), dont: rows.slice(iDont, iDone), done: rows.slice(iDone) };
    const lab = { write: Loc.label(rows[iWrite], "the one file to write"), read: Loc.label(rows[iRead], "the files to read"), todo: Loc.label(rows[iDo], "what it must do"), dont: Loc.label(rows[iDont], "must not touch"), done: Loc.label(rows[iDone], "what done means") };
    const hand = s.$(".hand"); hand.style.top = (250 + 46 + rows[iDont].offsetTop + 4) + "px";
    const one = (re, from) => { const hit = from.filter((o) => re.test(o.textContent)); if (!hit.length) throw new Error("brief: no printed line " + re); return hit; };

    // b1: the journeys, red.
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    s.in("#bf-red", s.start + 0.5, { y: 14 }); Loc.type(s, s.$("#bf-red"), s.start + 0.6, 0.4); Loc.print(s, s.$$("#bf-red .o"), c("b1", "agreed") + 0.1, 0.07);
    s.in(".redlab", c("b1", "agreed"), { x: 16, y: 0 }); s.in(".redlab .now", c("b1", "Now"), { y: 8 });
    s.in(".who .arrow, .who .to", c("b1", "someone"), { x: -10, y: 0, stagger: 0.1 });
    // b2: the brief is run.
    const t2 = c("b2");
    s.out("#bf-red, .redlab", t2 - 0.1, { dur: 0.35 }); s.in("#bf", t2 + 0.3, { y: 14 });
    const typed = Loc.type(s, s.$("#bf"), c("b2", "ortho"), Math.max(0.6, c("b2", "claim") + 0.3 - c("b2", "ortho")));
    Loc.print(s, rows, Math.max(typed + 0.15, c("b2", "$") - 0.2), 0.035);
    // b3: the file to write, the files to read, what it must do.
    [["write", c("b3", "one file")], ["read", c("b3", "files to read")], ["todo", c("b3", "must do")], ["dont", c("b4", "paths")], ["done", c("b5", "done means")]].forEach(([k, t], n, all) => {
      Loc.lit(s, "#bf", block[k], t); s.in(lab[k], t + 0.05, { x: 14, y: 0, dur: 0.35 }); if (all[n + 1]) s.out(lab[k], all[n + 1][1] - 0.05, { dur: 0.25 });
    });
    // b4: the three it names, inside the block that is lit.
    [[/^  blueprint\/\*\*$/, "blueprint"], [/^  journeys\/\*\*$/, "journeys"], [/^  generated\/\*\*$/, "generated"]].forEach(([re, w]) => s.to(one(re, block.dont), { backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, c("b4", w)));
    // b5: done is two commands passing.
    s.to(one(/ortho prove --env local passes/, block.done), { backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, c("b5", "prove passes"));
    s.to(one(/ortho check passes/, block.done), { backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, c("b5", "check passes"));
    Loc.lit(s, "#bf", [], c("b5", "Hand") - 0.1); s.out(lab.done, c("b5", "Hand") - 0.1, { dur: 0.25 });
    s.in(".hand", c("b5", "Hand"), { y: 16 });
  },
});
