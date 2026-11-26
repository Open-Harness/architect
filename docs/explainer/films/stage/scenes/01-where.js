// Sheet 1. Where it will run: green here, unreachable elsewhere; staging is one short file; then `ortho secrets`, replayed.
Film.scene("where", {
  step: "read",
  html: (D) => {
    const file = "blueprint/environments/staging.ts", text = D.src[file];
    const from = Kit.line(text, /^export default Blueprint\.environment\(/), to = Kit.line(text, /^\}\);$/);
    const servers = (text.match(/Deploy\.\w+\(/g) ?? []).length, dbs = (text.match(/Cloud\.d1\(/g) ?? []).length;
    if (servers !== 1 || dbs !== 1) throw new Error("where: the narration says one server and one database; staging.ts has " + servers + " and " + dbs);
    if (!/Identity\.betterAuth/.test(text)) throw new Error("where: staging.ts has no real sign-in");
    const sec = D.cap["stage-secrets"].out; if (!/^no secrets declared$/m.test(sec)) throw new Error("where: the secrets recording does not say none are declared");
    return `${Kit.css}${Stg.css("where")}<style>
      #scene-where .place { position: absolute; top: 440px; height: 300px; padding: 26px 30px; }
      #scene-where .place .kbig { margin-top: 14px; } #scene-where .place .note { margin-top: 16px; font-size: 28px; }
      #scene-where .mine { left: 96px; width: 800px; border: 1.5px solid var(--paper); background: rgba(11,23,39,.92); }
      #scene-where .cloud { left: 1024px; width: 800px; border: 2px dashed var(--rule2); background: rgba(11,23,39,.6); }
      #scene-where .gap { position: absolute; left: 896px; top: 580px; width: 128px; height: 2px; background: repeating-linear-gradient(90deg, var(--muted) 0 10px, transparent 10px 20px); }
      #scene-where .counts { position: absolute; left: 1210px; top: 262px; width: 614px; display: flex; flex-direction: column; gap: 14px; }
      #scene-where .cnt { display: flex; align-items: baseline; gap: 18px; padding: 10px 20px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); }
      #scene-where .cnt b { font-size: 44px; font-weight: 500; min-width: 1.4ch; font-variant-numeric: tabular-nums; } #scene-where .cnt span { font-size: 28px; } #scene-where .cnt code { margin-left: auto; font-family: var(--mono); font-size: 20px; color: var(--muted); }
      #scene-where .none { position: absolute; left: 1210px; top: 820px; width: 614px; }
    </style>
    <div class="head"><div class="eyebrow">Read where it will run</div><div class="hl">Staging is one short file.</div></div>
    <div class="who">${Kit.who("you")}</div>
    <div class="place mine"><div class="lbl">your machine</div><div class="kbig">Plugged In is <span class="gr">green</span> here.</div><div class="note n1 hidden0">Nobody else can reach it.</div></div>
    <div class="gap hidden0"></div>
    <div class="place cloud hidden0"><div class="lbl">a cloud account you pay for</div><div class="kbig">Something has to be made here.</div><div class="note n2 hidden0">You want to see what, before it is made.</div></div>
    ${Kit.ed(D, { id: "wh-ed", file, x: 96, y: 262, w: 1080, from, to, cls: "hidden0", tag: '<span class="tag">the whole of it</span>' })}
    <div class="counts">
      <div class="cnt q1 hidden0"><b>${servers}</b><span>server</span><code>Deploy.worker()</code></div>
      <div class="cnt q2 hidden0"><b>${dbs}</b><span>database</span><code>Cloud.d1()</code></div>
      <div class="cnt q3 hidden0"><b class="mu">·</b><span>real sign-in</span><code>Identity.betterAuth</code></div>
    </div>
    ${Kit.term(D, { id: "wh-sec", cap: "stage-secrets", x: 96, y: 700, w: 1080, h: 150, cls: "hidden0", tag: '<span class="tag">every secret the app declares</span>' })}
    <div class="abs none hidden0"><div class="say">Nothing is owed.</div></div>`;
  },
  build(s) {
    const c = s.cue, body = s.$("#wh-ed .code"), text = s.D.src["blueprint/environments/staging.ts"], n = (re) => Kit.line(text, re);
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // w1, w2: green here; nobody else; a cloud account, before anything is made.
    s.in(".mine", s.start + 0.5, { y: 16 }); s.in(".n1", c("w1", "Nobody"), { y: 8 });
    s.in(".gap", c("w2", "something") - 0.2, { x: -10, y: 0 }); s.in(".cloud", c("w2", "cloud account") - 0.3, { x: 16, y: 0 });
    s.in(".n2", c("w2", "see"), { y: 8 });
    // w3: the file, whole. The places drop into the lower third and stay as the reason for it.
    const t3 = c("w3");
    s.to(".mine, .cloud", { y: 230, scale: 0.86, transformOrigin: "50% 100%", opacity: 0.55, duration: 0.6, ease: "power2.inOut" }, t3 - 0.3);
    s.out(".gap", t3 - 0.3, { dur: 0.3 });
    s.in("#wh-ed", t3, { y: 14 });
    s.focus(body, [n(/Deploy\.worker\(/), n(/Deploy\.worker\(/)], c("w3", "server")); s.in(".q1", c("w3", "server"), { x: 14, y: 0, dur: 0.35 });
    s.focus(body, [n(/Cloud\.d1\(/), n(/Cloud\.d1\(/)], c("w3", "database")); s.in(".q2", c("w3", "database"), { x: 14, y: 0, dur: 0.35 });
    s.focus(body, [n(/Identity\.betterAuth/), n(/Identity\.betterAuth/)], c("w3", "real sign")); s.in(".q3", c("w3", "real sign"), { x: 14, y: 0, dur: 0.35 });
    // w4: every secret it declares. So we ask.
    const t4 = c("w4");
    s.focus(body, null, t4); s.out(".mine, .cloud", t4 - 0.1, { dur: 0.35 });
    s.in("#wh-sec", c("w4", "secret") - 0.2, { y: 14 });
    s.run(s.$("#wh-sec"), c("w4", "ask") - 0.3, { type: 0.9, at: c("w4", "none") - 0.2 });
    s.in(".none", c("w4", "none") + 0.2, { x: 14, y: 0 });
  },
});
