// Sheet 4. `ortho prove --changed` chooses all seven journeys and cannot build; a card marks the stand-in handler as staged;
// then the whole proof, at the journey claim a handle, six of eight, beside the step an author wrote months ago.
Film.scene("red", {
  step: "red",
  html: (D) => {
    const ops = Chg.ops(D), now = Chg.impact(D.cap["change-impact"].out, ["stale", "proven"]);
    const changed = D.cap["change-prove-changed"].out;
    const chosen = +(/proving all (\d+) journeys: cannot place /.exec(changed) ?? [])[1];
    Chg.need(chosen, D.facts.full.journeys.length, "d1 all the journeys"); Chg.need(chosen, 7, "d1 all seven journeys");
    if (!/^prove couldn't run: /m.test(changed) || !/No matching export .* for import "oneNamePerPerson"/.test(changed)) throw new Error("red: the narrowed proof did not fail to build as the film says");
    // The whole proof after the stand-in: which journeys passed, and the one that did not.
    const run = D.cap["change-prove"].out.split("\n"), journeys = run.filter((l) => l.startsWith("journey ")).map((l) => { const m = /^journey (.+) ([✔✘]) (\d+)\/(\d+) steps$/.exec(l); if (!m) throw new Error("red: a journey line changed shape: " + l); return { name: m[1], ok: m[2] === "✔", green: +m[3], steps: +m[4] }; });
    const passed = journeys.filter((j) => j.ok), failed = journeys.filter((j) => !j.ok);
    Chg.need(passed.length, 6, "d3 six journeys pass"); Chg.need(failed.length, 1, "d3 one journey fails");
    const claim = failed[0]; if (claim.name !== "claim a handle") throw new Error("red: the failing journey is not claim a handle");
    Chg.need(claim.green, 6, "d3 six of"); Chg.need(claim.steps, 8, "d3 of eight");
    const reasons = run.filter((l) => /^  ✘ ".*": expected refused with \w+, answered$/.test(l));
    if (!reasons.some((l) => l.includes("expected refused with HandleAlreadyOwned, answered"))) throw new Error("red: the run lost the reason the narration reads");
    const jf = "journeys/claim-a-handle.ts", js = D.src[jf], step = Kit.line(js, /"aaron cannot claim a second name while he holds one"/) - 1;
    if (!/^\s*s\.step\($/.test(js.split("\n")[step - 1])) throw new Error("red: the step does not open where expected");
    const end = js.split("\n").findIndex((l, k) => k + 1 > step && /^    \),$/.test(l)) + 1;
    const counts = { stale: `stale ${Chg.says(now.stale)} · proven ${Chg.says(now.proven)}` };
    return `${Kit.css}${Chg.css("red")}<style>
      #scene-red #rd-chg .screen { padding: 14px 22px; } #scene-red #rd-chg .tag, #scene-red #rd-prove .tag { color: var(--muted); }
      #scene-red .staged { left: 96px; top: 300px; width: 1100px; padding: 28px 34px 32px; border: 1.5px dashed var(--paper); background: #0b1727; }
      #scene-red .staged .stamp { display: inline-block; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; padding: 3px 12px; border: 1.5px solid var(--paper); color: var(--paper); }
      #scene-red .staged .say { margin-top: 22px; } #scene-red .staged .nob { margin-top: 18px; font-size: 32px; color: var(--text2); }
      #scene-red .nums { left: 1180px; top: 290px; width: 644px; }
      #scene-red .num { display: flex; align-items: baseline; gap: 22px; height: 104px; border-bottom: 1px solid var(--rule); }
      #scene-red .num b { font-family: var(--mono); font-size: 64px; font-weight: 500; line-height: 1; min-width: 160px; font-variant-numeric: tabular-nums; } #scene-red .num span { font-size: 26px; color: var(--text2); }
      #scene-red .months { left: 1180px; top: 690px; width: 644px; display: flex; align-items: center; gap: 18px; } #scene-red .months .say { font-size: 34px; }
      #scene-red #rd-step .tag { color: var(--cyan); }
    </style>
    <div class="head"><div class="eyebrow">Prove it</div><div class="hl">The journey that said the old rule.</div></div>
    ${Chg.who([["agent", "your agent"], ["author", "the author, months ago"]])}
    ${Kit.term(D, { id: "rd-chg", cap: "change-prove-changed", x: 96, y: 262, w: 1728, h: 320, size: 21, keep: (l) => /^prove --changed: |^prove couldn't run: |No matching export|^exit /.test(l), tag: '<span class="tag">narrowed to what changed</span>' })}
    <div class="abs staged hidden0"><span class="stamp">staged</span><div class="say">We stood in for the builder: the link goes on the oldest name.</div><div class="nob">Nobody decided that.</div></div>
    ${Kit.term(D, { id: "rd-prove", cap: "change-prove", x: 96, y: 262, w: 1050, h: 500, size: 20, cls: "hidden0", tag: '<span class="tag">the whole proof</span>', keep: (l) => l.startsWith("journey ") || reasons.includes(l) || /^prove /.test(l) })}
    <div class="abs nums"><div class="num n1 hidden0"><b>${passed.length}</b><span>journeys pass</span></div><div class="num n2 hidden0"><b>${claim.green}/${claim.steps}</b><span>${Film.esc(claim.name)}</span></div></div>
    ${Kit.ed(D, { id: "rd-step", file: jf, x: 1180, y: 262, w: 644, from: step, to: end, size: "small", cls: "hidden0", tag: '<span class="tag">the step</span>' })}
    <div class="abs months hidden0">${Kit.who("author", "the author")}<span class="say">wrote it down, months ago</span></div>
    ${Chg.band(D, "stale", counts)}`;
  },
  build(s) {
    const c = s.cue, A = s.$("#rd-chg"), P = s.$("#rd-prove");
    s.in(".head", s.start + 0.3); s.in(".band", s.start + 0.4, { y: 0 });
    // d1: prove what changed: all seven chosen, then no build.
    Chg.act(s, 0, s.start + 0.5); s.in(A, c("d1") - 0.1, { y: 14 });
    Chg.type(s, A, c("d1", "Prove"), 0.5);
    const first = Chg.rows(s, "#rd-chg", /^prove --changed: /)[0], ran = Chg.rows(s, "#rd-chg", /^prove couldn't run/)[0], why = Chg.rows(s, "#rd-chg", /No matching export/)[0];
    Chg.print(s, [first], c("d1", "can't place") - 0.1);
    Chg.glow(s, Chg.mark(first, "cannot place"), c("d1", "can't place")); Chg.glow(s, Chg.mark(first, "proving all 7 journeys"), c("d1", "all seven"));
    Chg.print(s, Chg.rows(s, "#rd-chg", /^prove couldn't run|No matching export|^exit /), c("d1", "And then"), 0.12);
    Chg.lit(s, "#rd-chg", [ran], c("d1", "can't run")); Chg.lit(s, "#rd-chg", [ran, why], c("d1", "doesn't build"));
    // d2: the stand-in, staged.
    s.out(A, c("d2") - 0.3, { dur: 0.3 }); s.in(".staged", c("d2", "stood"), { y: 14 }); s.in(".staged .nob", c("d2", "Nobody"), { y: 8 }); const stand = Chg.ring(s, "link.add", c("d2", "link"), "stand-in handler");
    // d3: the whole proof.
    const t3 = c("d3");
    s.out(".staged", t3 - 0.3, { dur: 0.3 }); s.out(stand, t3 - 0.3, { dur: 0.3 }); s.in(P, t3 - 0.1, { y: 14 });
    const typed = Chg.type(s, P, c("d3", "whole"), 0.4), rows = s.$$("#rd-prove .o");
    const pass = rows.filter((o) => / ✔ \d+\/\d+ steps$/.test(o.textContent)), claim = Chg.rows(s, "#rd-prove", /^journey claim a handle ✘/), rest = rows.filter((o) => !pass.includes(o) && !claim.includes(o));
    Chg.print(s, rows.filter((o) => o.textContent.startsWith("journey ")), Math.max(typed + 0.1, c("d3", "six") - 0.3), 0.07);
    Chg.lit(s, "#rd-prove", pass, c("d3", "pass")); s.in(".n1", c("d3", "six"), { x: 14, y: 0, dur: 0.35 });
    Chg.lit(s, "#rd-prove", claim, c("d3", "claim")); s.in(".n2", c("d3", "claim"), { x: 14, y: 0, dur: 0.35 });
    Chg.print(s, rest.filter((o) => !o.textContent.startsWith("journey ")), c("d3", "eight") + 0.2, 0.1);
    // d4: read the reason.
    const reason = Chg.rows(s, "#rd-prove", "expected refused with HandleAlreadyOwned, answered")[0];
    Chg.lit(s, "#rd-prove", [reason], c("d4", "reason"));
    Chg.glow(s, Chg.mark(reason, "expected refused with HandleAlreadyOwned"), c("d4", "expected")); Chg.glow(s, Chg.mark(reason, ", answered"), c("d4", "answered"));
    // d5: an author wrote the old rule down as a step.
    const t5 = c("d5");
    s.out(".nums", t5 - 0.1, { dur: 0.3 });
    Chg.act(s, 1, c("d5", "author")); s.in("#rd-step", c("d5", "author"), { y: 14 });
    const body = s.$("#rd-step .code"), named = +s.$$("#rd-step .ln")[1].dataset.n;
    s.focus(body, [named, named + 1], c("d5", "wrote")); s.in(".months", c("d5", "Months"), { y: 10 });
    s.focus(body, [named, named + 2], c("d5", "step is still"));
    Chg.lit(s, "#rd-prove", [reason, ...claim], c("d5", "still there"));
  },
});
