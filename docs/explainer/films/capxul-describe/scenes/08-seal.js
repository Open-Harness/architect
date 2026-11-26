// Sheet 8. One act: the spend is one operation, its reason sealed, and one signature covers the money and the reason together.
Film.scene("seal", {
  step: "join",
  html: (D) => `${Kit.css}<style>
      #scene-seal .intent { left: 1030px; top: 262px; right: 96px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; } #scene-seal .intent .kpill { font-family: var(--sans); font-size: 23px; color: var(--paper); padding: 6px 13px; }
      #scene-seal .two { top: 372px; width: 385px; height: 132px; } #scene-seal .two b { display: block; font-size: 30px; font-weight: 500; color: var(--paper); } #scene-seal .two .no { font-size: 22px; color: var(--red); margin-top: 4px; }
      #scene-seal .sig { left: 1030px; top: 560px; width: 794px; height: 150px; border: 2px solid var(--paper); padding: 14px 20px; } #scene-seal .sig .lbl { color: var(--paper); margin-bottom: 12px; }
      #scene-seal .sig .chip { font-size: 23px; color: var(--paper); margin-right: 10px; } #scene-seal .sig .sealc { border-color: var(--amber); color: var(--amber); }
      #scene-seal .words { left: 1030px; top: 792px; font-family: var(--mono); font-size: 24px; color: var(--paper); border: 1px solid var(--rule2); background: rgba(14,28,48,.92); padding: 10px 16px; white-space: nowrap; }
      #scene-seal .kept { left: 1432px; top: 778px; width: 392px; font-size: 24px; line-height: 1.3; color: var(--text2); } #scene-seal .kept b { color: var(--cyan); font-weight: 500; }
      #scene-seal .carry { left: 1030px; top: 890px; right: 96px; font-size: 24px; color: var(--text2); } #scene-seal .carry b { color: var(--amber); font-weight: 500; }
      #scene-seal svg.ink text { font-size: 21px; }
    </style>
    <div class="head"><div class="eyebrow">Describe · the verb</div><div class="hl">One act: pay, and say why.</div></div>
    ${Kit.ed(D, { id: "e-spend", file: "blueprint/things/budget/verbs/spend.ts", x: 96, y: 262, w: 900, size: "small", tag: '<span class="tag am">on the chain</span>' })}
    <div class="abs intent"><span class="lbl">Ada means</span><span class="kpill i0">pay this supplier</span><span class="kpill i1">from my budget</span><span class="kpill i2">for this reason</span></div>
    <div class="kbox chain two tw0" style="left:1030px"><div class="lbl">the chain</div><b>moves the money</b></div>
    <div class="kbox ours two tw1" style="left:1439px"><div class="lbl">our server</div><b>holds the reason</b><div class="no">not for a public chain</div></div>
    <div class="abs sig"><div class="lbl">what she signs · once</div><span class="chip m0">budget</span><span class="chip m0">amount</span><span class="chip m0">to</span><span class="chip sealc">seal 0x9c4e…b1</span></div>
    <svg class="ink" viewBox="0 0 1920 1080"><path class="am hash" d="M1300 792V752H1496V714"/><path class="hashh fillam" d="M1496 700l-8 16h16z"/><text class="hasht" x="1340" y="742" style="fill:var(--amber)">hashed</text>
      <path class="cy keep" d="M1330 818H1408"/><path class="keeph fillcy" d="M1422 818l-16-8v16z"/></svg>
    <div class="abs words">"Design work, March"</div>
    <div class="abs kept"><b>our server</b> keeps the words, under the seal</div>
    <div class="abs carry"><b>The chain</b> carries only the seal. Nobody can read it back.</div>${Kit.legend}`,
  build(s) {
    const c = s.cue, D = s.D, f = "blueprint/things/budget/verbs/spend.ts", body = s.$("#e-spend .code"), n = Kit.line(D, f, /reason: Blueprint\.sealed/);
    s.in(".head", s.start + 0.3); s.in("#e-spend", s.start + 0.5, { y: 14 }); s.in(".klegend", s.start + 0.9);
    s.in(".intent .lbl", c("o1", "means") - 0.3, { y: 6, dur: 0.3 }); ["pay this", "budget", "reason"].forEach((w, k) => s.in(".i" + k, c("o1", w), { y: 8, dur: 0.35 }));
    s.in(".tw0", c("o2", "chain moves") - 0.2, { y: 12, dur: 0.4 }); s.in(".tw1", c("o2", "reason") - 0.2, { y: 12, dur: 0.4 }); s.tl.set(s.$(".tw1 .no"), { autoAlpha: 0 }, 0); s.in(".tw1 .no", c("o2", "public chain") - 0.3, { y: 4, dur: 0.3 });
    s.focus(body, [n, n], c("o3", "sealed"));
    s.in(".words", c("o4", "reason travels") - 0.2, { y: 10, dur: 0.35 }); s.draw(".keep", c("o4", "our server") - 0.3, 0.4); s.in(".keeph, .kept", c("o4", "our server"), { y: 0, dur: 0.3 });
    s.tl.set(s.$$(".sig .m0, .sig .lbl"), { autoAlpha: 0 }, 0); s.fromTo(".sig", { autoAlpha: 0, borderColor: "rgba(233,240,250,0)" }, { autoAlpha: 1, duration: 0.3 }, c("o4", "seal") - 0.5);
    s.draw(".hash", c("o4", "seal") - 0.4, 0.5); s.in(".hashh, .hasht", c("o4", "seal"), { y: 0, dur: 0.25 }); s.in(".sealc", c("o4", "seal"), { y: 8, dur: 0.35 }); s.in(".carry", c("o4", "hash") - 0.2, { y: 8, dur: 0.35 });
    s.to(".sig", { borderColor: "#e9f0fa", duration: 0.4 }, c("o5", "signs once") - 0.2); s.in(".sig .lbl", c("o5", "signs once"), { y: 0, dur: 0.3 }); s.in(".sig .m0", c("o5", "money") - 0.2, { y: 8, stagger: 0.1, dur: 0.3 });
    s.fromTo(".sig", { boxShadow: "0 0 0 0px rgba(233,240,250,0)" }, { boxShadow: "0 0 0 8px rgba(233,240,250,.16)", duration: 0.35, yoyo: true, repeat: 1 }, c("o5", "together") - 0.2);
  },
});
