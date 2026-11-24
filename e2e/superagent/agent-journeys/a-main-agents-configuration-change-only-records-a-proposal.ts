// Slice 8: "a main agent's configuration change only records a proposal". The brief lists seven changes a main agent may only propose
// (`superagent.create`, `update`, `policy.save`, `policy.sync`, `account.list`, `settings.save`, `prompts.save`); five of them are
// called here, each by the main agent as itself (`agent:` role form, K40 fix 3), and none may change what it names. `emits` is a subset match,
// so a change applied as well as recorded passes the step that makes it; the later steps catch it, each by a person making the same change
// herself and being answered as a world where nothing was applied would answer (#934). The tape names which later step catches each one.
import { Blueprint, emits, expect } from "orthograph";
import { superagentUpdate, policySave, policySync, accountSeen, accountList, settingsSave, proposalWaiting, ProposalRecorded, AccountListed, itsMain } from "../kit/ops.ts";
import { PLAYBOOK, CONNECTIONS } from "../kit/consts.ts";

export default Blueprint.journey("a main agent's configuration change only records a proposal", {
  cast: { main: itsMain, ann: Blueprint.signedIn, sys: Blueprint.system },
  starts: "an-account-was-seen",    // seen and not listed, so an applied `account.list` would show
  steps: (s) => [
    s.step("the main agent would raise the pool to nine seats: only a proposal is recorded", s.main.run(superagentUpdate, { superagent: s.world.superagent, base: 1n, name: "coder", purpose: "Takes asks.", connections: CONNECTIONS, playbook: PLAYBOOK, slots: 9n }),
      emits(ProposalRecorded, { superagent: s.world.superagent })),
    s.step("ann saves her own change from the same base: the main agent's applied nothing, so it is not stale", s.ann.run(superagentUpdate, { superagent: s.world.superagent, base: 1n, name: "coder", purpose: "Takes asks.", connections: CONNECTIONS, playbook: PLAYBOOK, slots: 1n }),
      expect((a) => a.revision).toBe(2n)),
    s.step("the main agent would open the gate to a stranger: only a proposal is recorded", s.main.run(policySave, { superagent: s.world.superagent, base: 0n, mode: "auto", allowed: ["github:999"], bots: [], admission: {}, rules: [] }),
      emits(ProposalRecorded, { superagent: s.world.superagent })),
    s.step("the main agent would sync the allowed list from GitHub: only a proposal is recorded", s.main.run(policySync, { superagent: s.world.superagent, source: "github" }),
      emits(ProposalRecorded, { superagent: s.world.superagent })),
    s.step("the main agent would list an account: only a proposal is recorded", s.main.run(accountList, { account: s.world.account }),
      emits(ProposalRecorded, { superagent: s.world.superagent })),
    s.step("the main agent would unblock nothing and allow every command: only a proposal is recorded", s.main.run(settingsSave, { base: 0n, variables: [], blocked: [] }),
      emits(ProposalRecorded, { superagent: s.world.superagent })),
    s.step("five proposals wait for a person, each naming its operation, and nothing was applied",
      s.ann.run(proposalWaiting, { superagent: s.world.superagent }),
      expect((a) => a.items.map((p: { operation: string }) => p.operation)).toEqual(["superagent.update", "policy.save", "policy.sync", "account.list", "settings.save"]),
      expect((a) => a.items.every((p: { changes?: unknown; why?: string }) => p.changes !== undefined && typeof p.why === "string" && p.why.length > 0)).toBe(true)),
    s.step("ann saves a policy from the first base: the main agent's change applied nothing, so it is not stale", s.ann.run(policySave, { superagent: s.world.superagent, base: 0n, mode: "observe", allowed: [], bots: [], admission: {}, rules: [] }), expect((a) => a.revision).toBe(1n)),
    s.step("and settings: the same", s.ann.run(settingsSave, { base: 0n, variables: [], blocked: [] }), expect((a) => a.revision).toBe(1n)),
    s.step("ann lists the account herself: it was still seen, so the main agent's listing was not applied", s.ann.run(accountList, { account: s.world.account }),
      emits(AccountListed, { account: s.world.account })),
    // An applied sync would have listed the stand-in's one person (GitHub 3; GOAL17-person-sync). The door's own `account.seen` answers a known
    // account's id and keeps its state, so ann listing it then succeeds only if nobody listed it before.
    s.step("the door sees the roster's person, GitHub 3", s.sys.run(accountSeen, { superagent: s.world.superagent, source: "github", external: "3", login: "ann", bot: false })),
    s.step("ann lists that account herself: it was still seen, so the main agent's sync was not applied", s.ann.run(accountList, { account: s.last.account }),
      emits(AccountListed, {})),
  ],
});
