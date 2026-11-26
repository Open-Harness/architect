// Sheet 8. The same blueprint, seen by who is using it: five kinds of caller, and what is made for each.
Film.scene("users", {
  step: "falls out",
  html: () => {
    const who = [
      ["An owner", "a person, and an account with a seat", ["the app", "a grant that gathers the other owners' approvals"], ""],
      ["A member", "a person whose wallet holds a budget", ["one button: Spend", "her wallet signs", "a relayer sends it: no gas"], ""],
      ["An agent", "its own account, its own key", ["the same operation, as a tool", "it signs for itself", "the contract holds its limit"], "am"],
      ["The accountant", "a person with a role on the books", ["every payment and its reason", "the books", "nothing on the chain"], ""],
      ["Anyone", "an address", ["the contract itself", "who holds which role", "every event"], ""],
    ];
    return `<style>
      #scene-users .u { position: absolute; top: 262px; width: 330px; height: 410px; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); padding: 20px 20px; }
      #scene-users .u b { display: block; font-size: 34px; font-weight: 500; } #scene-users .u .as { font-size: 20px; color: var(--muted); margin: 6px 0 18px; min-height: 56px; line-height: 1.3; }
      #scene-users .u .gets { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 18px; font-weight: 600; color: var(--cyan); margin-bottom: 8px; } #scene-users .u li { font-size: 23px; line-height: 1.3; margin-bottom: 10px; } #scene-users .u ul { margin: 0; padding-left: 20px; }
      #scene-users .u.am { border-color: var(--amber); } #scene-users .u.am .gets { color: var(--amber); } #scene-users .last { left: 96px; right: 96px; top: 760px; text-align: center; }
    </style>
    <div class="head"><div class="eyebrow">Falls out · for each kind of caller</div><div class="hl">One blueprint. Five ways of using it.</div></div>
    ${who.map(([name, as, gets, cls], k) => `<div class="u u${k} ${cls}" style="left:${96 + k * 350}px"><b>${name}</b><div class="as">${as}</div><div class="gets">gets</div><ul>${gets.map((g) => `<li>${g}</li>`).join("")}</ul></div>`).join("")}
    <div class="abs last kbig">No SDK written per user. <span class="cy">Each way in is made for the callers who can use it.</span></div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3);
    [["u2", "owner"], ["u3", "member"], ["u4", "agent"], ["u5", "accountant"], ["u6", "anyone"]].forEach(([line, w], k) => { s.in(".u" + k, c(line, w) - 0.2, { y: 22, dur: 0.5 }); s.fromTo(`.u${k} li`, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.5 }, c(line, w) + 0.5); });
    s.to(".u2", { boxShadow: "0 0 0 6px rgba(255,181,92,.16)", duration: 0.3 }, c("u4", "why you can")); s.to(".u2", { boxShadow: "0 0 0 0px rgba(255,181,92,0)", duration: 0.4 }, c("u5") - 0.2);
    s.in(".last", c("u7") + 0.1);
  },
});
