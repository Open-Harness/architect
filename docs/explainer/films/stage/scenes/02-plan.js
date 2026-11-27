// Sheet 2. The plan, before anything is made: `ortho env up staging --plan --run demo1`, replayed; its three resources lift
// out as outlines with the prefix marked; then destroy's plan, replayed in the same place, names the same three.
Film.scene("plan", {
  step: "plan",
  html: (D) => {
    const { up, res } = Stg.plan(D), rec = D.cap["stage-plan"], gone = D.cap["stage-destroy-plan"];
    if (res.length !== 3) throw new Error("plan: the narration says three things; the plan has " + res.length);
    if (!rec.cmd.includes("--plan") || !rec.cmd.endsWith("--run " + up.run) || !gone.cmd.includes("destroy")) throw new Error("plan: the recorded commands are not the plan and destroy's plan for the run");
    const head = "ortho-", app = up.app.replace(/-/g, ""), lead = head + app + "-", tail = "-" + up.run;
    if (!up.prefix.startsWith(lead) || !up.prefix.endsWith(tail) || up.prefix.length <= lead.length + tail.length) throw new Error("plan: the prefix is not the app, the environment and the run");
    const env = up.prefix.slice(lead.length, up.prefix.length - tail.length);
    const part = (cls, text, word) => `<span class="seg ${cls}"><b>${Film.esc(text)}</b><i class="lbl">${word}</i></span>`;
    return `${Kit.css}${Stg.css("plan")}<style>
      #scene-plan .term .screen { font-size: 19px !important; line-height: 25px !important; padding: 14px 22px; }
      #scene-plan .runchip { position: absolute; left: 940px; top: 262px; width: 420px; }
      #scene-plan .touch { position: absolute; left: 1384px; top: 262px; width: 440px; }
      #scene-plan .runchip .val { font-family: var(--mono); font-size: 34px; color: var(--paper); }
      #scene-plan .touch .val { font-size: 30px; line-height: 1.2; }
      #scene-plan .runchip, #scene-plan .touch { border: 1px solid var(--rule2); background: rgba(14,28,48,.92); padding: 12px 20px; height: 100px; }
      #scene-plan .pfx { position: absolute; left: 940px; top: 384px; width: 884px; border: 1px solid var(--rule2); background: rgba(14,28,48,.92); padding: 12px 20px 10px; }
      #scene-plan .pfx .line { font-family: var(--mono); font-size: 32px; margin-top: 4px; padding-bottom: 30px; white-space: nowrap; }
      #scene-plan .seg { position: relative; display: inline-block; } #scene-plan .seg b { font-weight: 500; padding: 0 2px; border-bottom: 3px solid transparent; }
      #scene-plan .seg i.lbl { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); white-space: nowrap; font-style: normal; font-size: 19px; margin-top: 4px; visibility: hidden; opacity: 0; color: var(--cyan); }
      #scene-plan .seg.fix b { color: var(--muted); } #scene-plan .seg:not(.fix) { margin: 0 26px; }
      #scene-plan .count { position: absolute; left: 940px; top: 896px; width: 884px; display: flex; align-items: baseline; gap: 18px; }
      #scene-plan .count b { font-size: 52px; font-weight: 500; line-height: 1; } #scene-plan .count span { font-size: 26px; color: var(--text2); }
      #scene-plan .again { position: absolute; right: 16px; bottom: 12px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 19px; font-weight: 600; color: var(--paper); padding: 1px 10px; border: 1.5px solid var(--paper); background: #0b1727; }
    </style>
    <div class="head"><div class="eyebrow">Ask for the plan</div><div class="hl">What would be made, before it is.</div></div>
    <div class="who">${Kit.who("agent", "your agent")}</div>
    ${Kit.term(D, { id: "pl-up", cap: "stage-plan", x: 96, y: 262, w: 800, h: 712, cls: "hidden0", tag: '<span class="tag">--plan</span>' })}
    ${Kit.term(D, { id: "pl-down", cap: "stage-destroy-plan", x: 96, y: 262, w: 800, h: 712, cls: "hidden0", tag: '<span class="tag">--plan</span>' })}
    <div class="runchip hidden0"><div class="lbl">you name the run</div><div class="val">${Film.esc(up.run)}</div></div>
    <div class="touch hidden0"><div class="lbl">with the word plan</div><div class="val">it touches nothing</div></div>
    <div class="pfx hidden0"><div class="lbl">every name starts with one prefix</div><div class="line">${part("fix", head, "")}${part("app", app, "the app")}${part("fix", "-", "")}${part("envn", env, "environment")}${part("fix", "-", "")}${part("run", up.run, "the run")}</div></div>
    ${Stg.trio(D, { id: "pl-trio", x: 940, y: 534, w: 884, layout: "col", cls: "" })}
    <div class="count hidden0"><b>${res.length}</b><span>would be made · drawn as outlines, because none is</span></div>`;
  },
  build(s) {
    const c = s.cue, { res } = Stg.plan(s.D), A = s.$("#pl-up"), B = s.$("#pl-down");
    const kindRows = (sel) => res.map((r) => Stg.rows(s, sel, `"kind": "${r.kind}"`)[0]);
    const pairs = (sel) => kindRows(sel).map((row) => [row, row.nextElementSibling]);
    s.$$("#pl-trio .res").forEach((r) => { r.classList.add("hidden0"); const a = document.createElement("div"); a.className = "again hidden0"; a.textContent = "destroy names it"; r.appendChild(a); });
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // p1: one run, named.
    s.in(".runchip", c("p1", "name the run"), { y: 12 });
    s.fromTo(".runchip .val", { color: "#e9f0fa" }, { color: "#62c6ff", duration: 0.3 }, c("p1", "demo"));
    // p2: the command, with the word plan; it prints, and touches nothing.
    s.in(A, s.start + 0.6, { y: 14 });
    const plan = Stg.mark(A.querySelector(".typed"), "--plan"), run = Stg.mark(A.querySelector(".typed"), s.D.cap["stage-plan"].cmd.slice(s.D.cap["stage-plan"].cmd.lastIndexOf(" ") + 1));
    s.run(A, c("p2", "ortho"), { type: Math.max(0.8, c("p2", "with") - c("p2", "ortho")), at: c("p2", "prints"), each: 0.05 });
    Stg.hit(s, plan, c("p2", "plan")); Stg.hit(s, run, c("p2", "plan") + 0.2);
    s.in(".touch", c("p2", "touches"), { y: 12 });
    // p3: three things, each lifted out of the printed plan.
    const up = pairs("#pl-up");
    [["server", 0], ["database", 1], ["namespace", 2]].forEach(([w, k]) => {
      Stg.lit(s, "#pl-up", up.slice(0, k + 1).flat(), c("p3", w));
      s.in("#pl-trio .res" + k, c("p3", w), { x: 24, y: 0, dur: 0.45 });
    });
    s.in(".count", c("p3", "namespace") + 0.5, { y: 10 });
    // p4: the prefix, and what it is made of.
    Stg.lit(s, "#pl-up", Stg.rows(s, "#pl-up", '"prefix"'), c("p4", "prefix"));
    s.in(".pfx", c("p4", "prefix") - 0.1, { y: 10 }); Stg.prefix(s, "#pl-trio", c("p4", "prefix") + 0.3);
    [["app", "app"], ["envn", "environment"], ["run", "run"]].forEach(([cls, w]) => {
      s.in(`.seg.${cls} i.lbl`, c("p4", w), { y: 6, dur: 0.3 }); s.to(`.seg.${cls} b`, { color: "#62c6ff", borderBottomColor: "#62c6ff", duration: 0.3 }, c("p4", w));
    });
    // p5: destroy's plan, in the same place, names the same three.
    const t5 = c("p5", "Destroy");
    s.out(A, t5 - 0.35, { dur: 0.3 }); s.in(B, t5 - 0.1, { y: 0, dur: 0.3 });
    const dplan = Stg.mark(B.querySelector(".typed"), "destroy");
    s.run(B, t5, { type: Math.max(0.7, c("p5", "prints") - t5 - 0.1), at: c("p5", "prints"), each: 0.04 });
    Stg.hit(s, dplan, t5 + 0.4);
    Stg.lit(s, "#pl-down", pairs("#pl-down").flat(), c("p5", "same three"));
    s.in("#pl-trio .again", c("p5", "same three"), { y: 6, dur: 0.3, stagger: 0.12 });
  },
});
