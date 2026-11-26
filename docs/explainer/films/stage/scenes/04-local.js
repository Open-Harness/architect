// Sheet 4. The same file, here first: `ortho env up staging --port`, replayed; the bundle answer's last line beside the build's
// two tags, matched by eye; then `ortho env down staging`. The plan's outlines still wait in the corner.
Film.scene("local", {
  step: "local",
  html: (D) => {
    const b = Stg.built(D), up = D.cap["stage-local-up"], http = D.cap["stage-bundle-http"], down = D.cap["stage-local-down"];
    if (up.cmd.includes("--run") || !up.cmd.includes("--port")) throw new Error("local: the local staging was not started with a port and no run");
    if (!/^staging up http:\/\/127\.0\.0\.1:\d+$/m.test(up.out) || !/^staging down$/m.test(down.out)) throw new Error("local: the recordings do not show staging up, then down");
    const last = http.out.split("\n").filter((l) => l.trim()).pop(), ans = JSON.parse(last);
    if (ans.revision !== b.commit || ans.sha256 !== b.sha.replace(/^sha256:/, "")) throw new Error("local: the bundle answer is not the build's commit and fingerprint");
    return `${Kit.css}${Stg.css("local")}<style>
      #scene-local .here { position: absolute; left: 1420px; top: 262px; width: 404px; height: 150px; border: 1px solid var(--rule2); background: rgba(14,28,48,.92); padding: 14px 20px; }
      #scene-local .here .state { display: flex; align-items: center; gap: 14px; font-size: 32px; margin-top: 10px; }
      #scene-local .here .dot { width: 16px; height: 16px; border-radius: 50%; background: var(--cyan); }
      #scene-local .eq { position: absolute; left: 1430px; width: 394px; font-size: 30px; color: var(--paper); display: flex; align-items: center; gap: 16px; }
      #scene-local .eq b { font: 500 44px var(--mono); color: var(--paper); }
      #scene-local .triocap { left: 96px; top: 916px; }
    </style>
    <div class="head"><div class="eyebrow">Run the same file here first</div><div class="hl">Staging, on your machine.</div></div>
    <div class="who">${Kit.who("agent", "your agent")}</div>
    ${Kit.term(D, { id: "lc-up", cap: "stage-local-up", x: 96, y: 262, w: 1300, h: 150, cls: "hidden0", tag: '<span class="tag">a port, no run</span>' })}
    <div class="here hidden0"><div class="lbl">your machine</div><div class="state"><i class="dot"></i><span class="st1">it stays up</span></div></div>
    ${Kit.term(D, { id: "lc-http", cap: "stage-bundle-http", x: 96, y: 430, w: 1728, h: 150, cls: "hidden0", keep: (l) => l === last, tag: '<span class="tag">what are you running?</span>' })}
    ${Stg.tags(D, { id: "lc-tags", x: 96, y: 596, w: 1310, cls: "hidden0", small: true })}
    <div class="eq e1 hidden0" style="top:628px"><b>=</b>the same commit</div>
    <div class="eq e2 hidden0" style="top:722px"><b>=</b>the same fingerprint</div>
    ${Kit.term(D, { id: "lc-down", cap: "stage-local-down", x: 96, y: 262, w: 1300, h: 150, cls: "hidden0" })}
    <div class="triocap">the plan · still nothing made</div>
    ${Stg.trio(D, { id: "lc-trio", x: 1104, y: 906, w: 720, layout: "mini" })}`;
  },
  build(s) {
    const c = s.cue, b = Stg.built(s.D), U = s.$("#lc-up"), H = s.$("#lc-http"), Dn = s.$("#lc-down");
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in("#lc-trio, .triocap", s.start + 0.5, { y: 0 });
    // l1, l2: the same file as staging here, with a port and no run. It stays up.
    s.in(U, c("l1", "same file"), { y: 12 });
    const port = Stg.mark(U.querySelector(".typed"), "--port");
    s.run(U, c("l2", "Ortho"), { type: Math.max(0.8, c("l2", "port") - c("l2", "Ortho") + 0.3), at: c("l2", "starts"), each: 0.1 });
    Stg.hit(s, port, c("l2", "port"));
    s.in(".here", c("l2", "stays"), { x: 14, y: 0 });
    // l3: ask it what it is running.
    s.in(H, c("l3") - 0.2, { y: 12 });
    s.run(H, c("l3", "ask"), { type: 0.7, at: c("l3", "running") + 0.2, each: 0.1 });
    const row = s.$$("#lc-http .o")[0], rev = Stg.mark(row, b.commit), sha = Stg.mark(row, b.sha.replace(/^sha256:/, ""));
    // l4: the same commit, the same fingerprint, beside the build's tags.
    s.in("#lc-tags", c("l4") - 0.2, { y: 0, dur: 0.01 }); s.fromTo("#lc-tags .tagbox", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.1 }, c("l4") - 0.2);
    Stg.hit(s, rev, c("l4", "same commit")); s.to("#lc-tags .t1", { borderColor: "#62c6ff", duration: 0.3 }, c("l4", "same commit")); s.in(".e1", c("l4", "same commit"), { x: 14, y: 0, dur: 0.35 });
    Stg.hit(s, sha, c("l4", "same fingerprint")); s.to("#lc-tags .t2", { borderColor: "#62c6ff", duration: 0.3 }, c("l4", "same fingerprint")); s.in(".e2", c("l4", "same fingerprint"), { x: 14, y: 0, dur: 0.35 });
    // Then env down stops it.
    const td = c("l4", "env down");
    s.out(U, td - 0.3, { dur: 0.25 }); s.in(Dn, td - 0.1, { y: 0, dur: 0.25 });
    s.run(Dn, td, { type: 0.5, at: c("l4", "stops"), each: 0.1 });
    s.to(".here .dot", { backgroundColor: "#4d6382", duration: 0.3 }, c("l4", "stops") + 0.1);
    s.to(".here .st1", { autoAlpha: 0, duration: 0.2 }, c("l4", "stops"));
  },
});
