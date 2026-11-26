// Sheet 4. What goes in: the handle's thing, its machine, the claim operation and the rules, each quoted from its file.
Film.scene("blueprint", {
  step: "describe",
  html: (D) => {
    const dir = "blueprint/things/handle/", src = (f) => D.src[dir + f], lines = (f) => src(f).trimEnd().split("\n").length;
    const body = (f) => src(f).split("\n").findIndex((l, k, all) => k > 0 && all[k - 1] === "" && !l.startsWith("import")) + 1; // the first line after the imports
    const ed = (id, file) => `<div class="panel ed" id="ed-${id}" style="left:458px;top:262px;width:1366px">${Film.editor(id, dir + file, Film.code(src(file), { from: body(file) }), '<span class="tag">you write</span>')}</div>`;
    const tree = ["plugged-in/", " blueprint/", "  things/", "   handle/", ...D.facts.handleFiles.filter((f) => !f.includes("/verbs/")).map((f) => "    " + f.split("/").pop()), "    verbs/",
      ...D.facts.handleFiles.filter((f) => f.includes("/verbs/")).map((f) => "     " + f.split("/").pop()), "   link/", "   profile/"];
    const ops = D.facts.operations;
    return `<style>
      #scene-blueprint .tree { left: 96px; top: 262px; width: 330px; padding: 16px 0; font-family: var(--mono); font-size: 20px; line-height: 35px; color: var(--muted); }
      #scene-blueprint .tree div { position: relative; padding: 0 20px; white-space: pre; } #scene-blueprint .tree .dir { color: var(--text2); }
      #scene-blueprint .tree .mark { position: absolute; left: 0; right: 0; top: 0; height: 35px; padding: 0; background: rgba(98,198,255,.13); border-left: 3px solid var(--cyan); }
      #scene-blueprint .call { position: absolute; right: 30px; transform: translateY(-50%); font-family: var(--label); text-transform: uppercase; letter-spacing: 0.13em; font-size: 22px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; }
      #scene-blueprint .call::before { content: ""; width: 54px; height: 1px; background: var(--rule2); }
      #scene-blueprint .mock { left: 300px; top: 300px; width: 400px; height: 560px; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.95), rgba(12,24,42,.96)); padding: 44px 34px; text-align: center; }
      #scene-blueprint .mock .av { width: 96px; height: 96px; border-radius: 50%; border: 2px solid var(--paper); margin: 0 auto 18px; display: grid; place-items: center; font-size: 40px; font-weight: 500; }
      #scene-blueprint .mock .at { font-family: var(--mono); font-size: 34px; margin-bottom: 30px; }
      #scene-blueprint .mock .row { height: 62px; border: 1px solid var(--rule2); margin-top: 16px; display: grid; place-items: center; font-size: 24px; } #scene-blueprint .mock .row i { width: 130px; height: 10px; background: var(--rule2); }
      #scene-blueprint .intro { left: 800px; top: 320px; width: 1020px; } #scene-blueprint .intro .hl { font-size: 84px; margin: 8px 0 14px; } #scene-blueprint .intro .note { font-size: 34px; }
      #scene-blueprint .intro .set { margin-top: 44px; display: flex; flex-wrap: wrap; gap: 12px; max-width: 880px; align-items: center; } #scene-blueprint .intro .set .lbl { width: 100%; margin-top: 16px; }
      #scene-blueprint .node { position: absolute; top: 792px; height: 62px; width: 230px; display: grid; place-items: center; border: 2px solid var(--paper); font-family: var(--mono); font-size: 24px; background: var(--bg2); }
      #scene-blueprint .sum { left: 458px; top: 262px; width: 1366px; } #scene-blueprint .sum .hl { font-size: 66px; } #scene-blueprint .sum .files { display: flex; gap: 14px; margin: 34px 0 110px; flex-wrap: wrap; }
      #scene-blueprint .sum .files .chip em { color: var(--muted); font-style: normal; } #scene-blueprint .nots { display: flex; gap: 22px; margin-top: 22px; }
      #scene-blueprint .not { position: relative; font-size: 46px; color: var(--text2); padding: 10px 26px; border: 1px dashed var(--rule2); } #scene-blueprint .not s { position: absolute; left: 14px; right: 14px; top: 52%; height: 3px; background: var(--red); transform-origin: 0 50%; }
    </style>
    <div class="head"><div class="eyebrow">What goes in</div><div class="hl">The blueprint: one small file per fact.</div></div>
    <div class="abs mock"><div class="av">a</div><div class="at">@aaron</div><div class="row r1">GitHub</div><div class="row r2"><i></i></div><div class="row r3"><i></i></div></div>
    <div class="abs intro"><div class="eyebrow">The example app</div><div class="hl">Plugged In</div><div class="note">Claim a name. Get a public page of links.</div>
      <div class="set"><div class="lbl things">${D.facts.things.length} things</div>${D.facts.things.map((t) => `<span class="chip things">${t}</span>`).join("")}
      <div class="lbl ops">${ops.length} operations</div>${ops.map((o) => `<span class="chip ops"${o === "handle.claim" ? ' style="border-color:var(--paper);color:var(--paper)"' : ' style="color:var(--text2)"'}>${o}</span>`).join("")}</div></div>
    <div class="panel tree"><div class="mark hidden0"></div>${tree.map((row) => `<div class="${row.endsWith("/") ? "dir" : "file"}" data-f="${row.trim()}">${row}</div>`).join("")}</div>
    ${ed("thing", "thing.ts")}${ed("machine", "machine.ts")}${ed("claim", "verbs/claim.ts")}${ed("rules", "invariants.ts")}
    <svg class="ink mach" viewBox="0 0 1920 1080"><circle class="dot fillpaper" cx="640" cy="823" r="9"/>
      <path class="mv1" d="M655 823H888"/><path class="mh1 fillpaper" d="M902 823l-16-8v16z"/><path class="mv2" d="M1132 823H1408"/><path class="mh2 fillpaper" d="M1422 823l-16-8v16z"/>
      <text class="mt1" x="775" y="808" text-anchor="middle">claim</text><text class="mt2" x="1272" y="808" text-anchor="middle">release</text>
      <text class="mt1" x="775" y="854" text-anchor="middle" style="font-size:17px">emits HandleClaimed</text><text class="mt2" x="1272" y="854" text-anchor="middle" style="font-size:17px">emits HandleReleased</text></svg>
    <div class="node n1 mach" style="left:902px">claimed</div><div class="node n2 mach" style="left:1422px">released</div>
    <div class="abs sum"><div class="hl">That's the whole description.</div>
      <div class="files">${[["thing.ts", "thing.ts"], ["machine.ts", "machine.ts"], ["verbs/claim.ts", "verbs/claim.ts"], ["invariants.ts", "invariants.ts"]].map(([f]) => `<span class="chip">${f} <em>${lines(f)} lines</em></span>`).join("")}</div>
      <div class="lbl" style="font-size:24px">Written nowhere in it</div>
      <div class="nots"><div class="not">a route<s></s></div><div class="not">request parsing<s></s></div><div class="not">command line flags<s></s></div></div></div>`;
  },
  build(s) {
    const c = s.cue, $ = s.$;
    s.in(".head", s.start + 0.3);
    // The example.
    s.in(".mock", c("b1", "Plugged") - 0.2, { y: 30 }); s.in(".intro .eyebrow, .intro .hl", c("b1", "Plugged"), { stagger: 0.1 });
    s.in(".intro .note", c("b1", "claim a name")); s.fromTo(".mock .row", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.14, duration: 0.4 }, c("b1", "public page"));
    s.in(".intro .things", c("b1", "$") - 0.9, { stagger: 0.07, y: 8 }); s.in(".intro .ops", c("b1", "$") - 0.3, { stagger: 0.05, y: 8 });
    const t2 = c("b2", "Start");
    s.out(".mock, .intro", t2 - 0.25, { dur: 0.35 }); s.in(".tree", t2 + 0.1, { x: -20, y: 0 });
    // One file after another: the tree's marker moves, the editors swap.
    const mark = $(".tree .mark"), row = (f) => $(`.tree [data-f="${f}"]`);
    const open = (id, file, t, first) => {
      s.tl.to(mark, { top: row(file).offsetTop, autoAlpha: 1, duration: first ? 0.01 : 0.4, ease: "power2.inOut" }, t);
      s.tl.to(row(file), { color: "#e9f0fa", duration: 0.3 }, t); s.in("#ed-" + id, t, { y: 14 });
    };
    const shut = (id, file, t) => { s.out("#ed-" + id, t - 0.3, { dur: 0.3 }); s.tl.to(row(file), { color: "#7389a6", duration: 0.3 }, t); };
    open("thing", "thing.ts", t2 + 0.2, true);
    s.focus("#ed-thing .code", [8, 12], c("b2", "A handle")); s.focus("#ed-thing .code", [9, 9], c("b2", "id")); s.focus("#ed-thing .code", [10, 10], c("b2", "name")); s.focus("#ed-thing .code", [11, 11], c("b2", "owner"));
    s.focus("#ed-thing .code", [8, 12], c("b2", "$") + 0.15);
    const t3 = c("b3", "machine");
    shut("thing", "thing.ts", t3); open("machine", "machine.ts", t3);
    s.focus("#ed-machine .code", [6, 6], c("b3", "states")); s.in(".node", c("b3", "states") + 0.1, { stagger: 0.15, y: 12 }); s.in(".dot", c("b3", "states"), { y: 0 });
    s.focus("#ed-machine .code", [7, 10], c("b3", "moves")); s.draw(".mv1", c("b3", "moves"), 0.5); s.draw(".mv2", c("b3", "moves") + 0.3, 0.5); s.in(".mh1, .mh2", c("b3", "moves") + 0.55, { y: 0, dur: 0.2, stagger: 0.3 }); s.in(".mt1, .mt2", c("b3", "moves") + 0.3, { y: 0, stagger: 0.15 });
    const lit = { borderColor: "#62c6ff", color: "#62c6ff", boxShadow: "0 0 0 6px rgba(98,198,255,.14)", duration: 0.3 };
    s.to(".n1", lit, c("b3", "Claimed")); s.focus("#ed-machine .code", [8, 8], c("b3", "Claimed"));
    s.to(".n2", lit, c("b3", "released")); s.focus("#ed-machine .code", [9, 9], c("b3", "released"));
    const t4 = c("b4", "Now");
    shut("machine", "machine.ts", t4); s.out(".mach", t4 - 0.3, { dur: 0.3 }); open("claim", "claim.ts", t4);
    const body = $("#ed-claim .code"), calls = [[9, "what comes in", "b5", "comes in"], [10, "what goes back", "b5", "goes back"], [11, "the move it makes", "b5", "move"], [12, "who may call", "b6", "Who"], [13, "what it may write", "b6", "allowed to write"], [14, "twice counts once", "b7", "same request"], [15, "how fast", "b7", "how fast"]];
    s.focus(body, [7, 7], c("b4", "Claim is"));
    calls.forEach(([n, label, line, word]) => {
      const el = document.createElement("div"); el.className = "call hidden0"; el.textContent = label; el.style.top = s.lineY(body, n) + "px"; body.appendChild(el);
      s.focus(body, [n, n], c(line, word), 0.35); s.in(el, c(line, word) + 0.05, { x: 16, y: 0, dur: 0.4 });
    });
    s.focus(body, [7, 16], c("b7", "$") + 0.25);
    const t8 = c("b8", "Last");
    shut("claim", "claim.ts", t8); open("rules", "invariants.ts", t8);
    const rules = $("#ed-rules .code");
    s.focus(rules, [6, 10], c("b8", "A name")); s.focus(rules, [12, 17], c("b8", "A person"));
    [[9, "HandleTaken"], [15, "HandleAlreadyOwned"]].forEach(([n, name], k) => {
      const el = document.createElement("div"); el.className = "call hidden0"; el.innerHTML = `refuses with <span class="mono" style="letter-spacing:0;text-transform:none;color:var(--red)">${s.D.facts.refusals[name]}</span>`; el.style.top = s.lineY(rules, n) + "px"; rules.appendChild(el);
      s.in(el, c("b8", "Each rule") + k * 0.25, { x: 16, y: 0, dur: 0.4 });
    });
    s.focus(rules, null, c("b8", "Each rule"));
    const t9 = c("b9");
    shut("rules", "invariants.ts", t9); s.to(mark, { autoAlpha: 0, duration: 0.3 }, t9);
    s.in(".sum .hl", t9 + 0.05); s.in(".sum .files .chip", t9 + 0.35, { stagger: 0.08, y: 8 }); s.in(".sum .lbl", c("b9", "Notice"));
    [["no route", 0], ["no request", 1], ["no command", 2]].forEach(([w, k]) => {
      const n = s.$$(".not")[k]; s.in(n, c("b9", w), { y: 10, dur: 0.3 }); s.fromTo(n.querySelector("s"), { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power2.inOut" }, c("b9", w) + 0.25);
    });
  },
});
