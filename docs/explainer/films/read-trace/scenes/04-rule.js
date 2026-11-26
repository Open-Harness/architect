// Sheet 4. The line that gave it: the refusal came from six lines of blueprint, read where they stand in invariants.ts.
Film.scene("rule", {
  step: "rule",
  html: (D) => {
    const file = "blueprint/things/handle/invariants.ts", src = D.src[file], rows = src.split("\n");
    const decl = Kit.line(src, /oneNamePerPerson/), from = decl - 1, to = rows.findIndex((l, k) => k >= decl && /^\}\);/.test(l)) + 1;
    if (!rows[from - 1].startsWith("//") || to - from + 1 !== 6) throw new Error("the rule is no longer six lines under its comment");
    const code = (/\[[A-Z]+-\d+\]/.exec(D.cap["claim-second"].out) ?? [])[0]; if (!code) throw new Error("the refusal's code is gone from the recording");
    return `${Kit.css}${Loc.css}<style>
      #scene-rule .from { left: 96px; top: 262px; display: flex; gap: 20px; align-items: center; } #scene-rule .from .chip { font-family: var(--sans); font-size: 28px; padding: 9px 22px; } #scene-rule .from .was { position: relative; color: var(--muted); }
      #scene-rule .from .was u { position: absolute; left: 12px; right: 12px; top: 52%; height: 2px; background: var(--paper); transform-origin: 0 50%; } #scene-rule .from .is { color: var(--paper); border-color: var(--paper); } #scene-rule .from .lbl { font-size: 22px; }
      #scene-rule #ru-ed .code { font-size: 28px; line-height: 48px; }
      #scene-rule .stops { left: 96px; top: 800px; width: 1728px; display: flex; align-items: center; } #scene-rule .stop { flex: none; padding: 12px 24px; border: 1.5px solid var(--rule2); font-size: 30px; color: var(--muted); background: rgba(14,28,48,.9); white-space: nowrap; }
      #scene-rule .stop b { font-family: var(--mono); font-weight: 400; font-size: .86em; } #scene-rule .leg { flex: 1; height: 2px; background: var(--rule2); transform-origin: 0 50%; }
      #scene-rule .two { left: 96px; top: 892px; font-size: 26px; color: var(--cyan); }
    </style>
    <div class="head"><div class="eyebrow">The line that gave it</div><div class="hl">Six lines of blueprint said no.</div></div>
    <div class="lwho">${Kit.who("you")}${Kit.who("agent", "your agent")}</div>
    <div class="abs from"><span class="lbl">the refusal came from</span><span class="chip was hidden0">the handler<u></u></span><span class="chip is hidden0">${to - from + 1} lines of blueprint</span></div>
    ${Kit.ed(D, { id: "ru-ed", file, x: 96, y: 340, w: 1728, from, to, tag: '<span class="tag">blueprint</span>' })}
    <div class="abs stops"><span class="stop s1"><b>${Film.esc(code)}</b> on screen</span><i class="leg l1"></i><span class="stop s2">the trace</span><i class="leg l2"></i><span class="stop s3">the rule</span></div>
    <div class="abs two lbl hidden0">two commands</div>`;
  },
  build(s) {
    const c = s.cue, body = s.$("#ru-ed .code"), n0 = +s.$$("#ru-ed .ln")[0].dataset.n;
    s.in(".head", s.start + 0.3); s.in(".lwho", s.start + 0.5, { y: 0 });
    s.in(".from .lbl", c("u1", "refusal"), { y: 0 }); s.in(".was", c("u1", "handler"), { y: 8 }); s.fromTo(".was u", { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, c("u1", "at all"));
    s.in(".is", c("u1", "six lines"), { y: 8 }); s.in("#ru-ed", c("u1", "It came"), { y: 18 });
    [[0, "A person"], [1, "unique"], [2, "while"], [3, "Refuse"]].forEach(([k, word]) => s.focus(body, [n0 + k, n0 + k], c("u2", word), 0.35));
    s.focus(body, null, c("u3") - 0.1);
    s.in(".stops", c("u3") - 0.1, { y: 12 });
    const on = { color: "#e9f0fa", borderColor: "#62c6ff", duration: 0.3 };
    s.to(".s1", on, c("u3", "saw")); s.fromTo(".l1", { scaleX: 0 }, { scaleX: 1, duration: 0.4 }, c("u3", "screen")); s.to(".s2", on, c("u3", "to"));
    s.fromTo(".l2", { scaleX: 0 }, { scaleX: 1, duration: 0.4 }, c("u3", "the line") - 0.3); s.to(".s3", on, c("u3", "line"));
    s.to(".leg", { backgroundColor: "#62c6ff", duration: 0.3 }, c("u3", "two")); s.in(".two", c("u3", "two"), { y: 8 });
  },
});
