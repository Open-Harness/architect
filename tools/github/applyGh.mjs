// Applies the sync's steps to GitHub, one write at a time with a pause after each (pace.mjs). The plans decide; this does.
import { execFileSync } from "node:child_process";
import { foldComment } from "./boardPlan.mjs";
import { PAUSE_CREATE_MS, PAUSE_WRITE_MS, pause } from "./pace.mjs";

const TYPE_MUTATION = "mutation($o:ID!,$n:String!,$c:IssueTypeColor!,$d:String!){createIssueType(input:{ownerId:$o,name:$n,color:$c,description:$d,isEnabled:true}){issueType{id}}}";

/** gh, ghAll: the REST helpers of sync.mjs. rowById: the board's rows by id, for a fold's comment. */
export const applySteps = ({ steps, state, repo, rowById, gh, ghAll }) => {
  const milestones = new Map(state.milestones.map((m) => [m.title, m.number]));
  const created = new Map();
  const issueRef = (x) => (typeof x === "number" ? { number: x, id: state.issues.find((i) => i.number === x).id } : created.get(x));
  for (const s of steps) {
    if (s.do === "createLabel") gh(`repos/${repo}/labels`, { method: "POST", body: { name: s.name, color: s.color, description: s.description } });
    if (s.do === "updateLabel") gh(`repos/${repo}/labels/${encodeURIComponent(s.name)}`, { method: "PATCH", body: { color: s.color, description: s.description } });
    if (s.do === "createMilestone") milestones.set(s.title, gh(`repos/${repo}/milestones`, { method: "POST", body: { title: s.title, description: s.description } }).number);
    if (s.do === "updateMilestone") gh(`repos/${repo}/milestones/${s.number}`, { method: "PATCH", body: { description: s.description } });
    if (s.do === "setMilestoneDue") gh(`repos/${repo}/milestones/${milestones.get(s.title)}`, { method: "PATCH", body: { due_on: s.day ? `${s.day}T12:00:00Z` : null } });
    if (s.do === "createIssue") {
      const i = gh(`repos/${repo}/issues`, { method: "POST", body: { title: s.title, body: s.body, labels: s.labels, milestone: milestones.get(s.milestone), type: s.type } });
      created.set(s.key, { number: i.number, id: i.id });
    }
    if (s.do === "updateIssue") {
      const extra = { ...(s.body ? { body: s.body } : {}), ...(s.labels ? { labels: s.labels } : {}), ...(s.state ? { state: s.state } : {}), ...(s.milestone ? { milestone: milestones.get(s.milestone) } : {}), ...(s.type ? { type: s.type } : {}) };
      gh(`repos/${repo}/issues/${s.number}`, { method: "PATCH", body: { title: s.title, ...extra } });
    }
    if (s.do === "closeIssue") gh(`repos/${repo}/issues/${issueRef(s.issue).number}`, { method: "PATCH", body: { state: "closed" } });
    if (s.do === "foldIssue") {
      // The comment first, then the close; a hidden line in the comment keeps a re-run from saying it twice.
      const into = issueRef(s.into).number;
      const said = ghAll(`repos/${repo}/issues/${s.number}/comments?per_page=100`).some((c) => (c.body ?? "").includes(`orthograph:folded=${s.row}`));
      if (!said) gh(`repos/${repo}/issues/${s.number}/comments`, { method: "POST", body: { body: foldComment(rowById.get(s.row), into) } });
      gh(`repos/${repo}/issues/${s.number}`, { method: "PATCH", body: { state: "closed", state_reason: "duplicate" } });
    }
    if (s.do === "createIssueType") {
      execFileSync("gh", ["api", "graphql", "-f", `query=${TYPE_MUTATION}`, "-f", `o=${state.ownerId}`, "-f", `n=${s.name}`, "-f", `c=${s.color}`, "-f", `d=${s.description}`], { encoding: "utf8" });
    }
    if (s.do === "setType") gh(`repos/${repo}/issues/${s.number}`, { method: "PATCH", body: { type: s.type } });
    if (s.do === "removeBlockedBy") gh(`repos/${repo}/issues/${s.issue}/dependencies/blocked_by/${issueRef(s.blocker).id}`, { method: "DELETE" });
    if (s.do === "addBlockedBy") gh(`repos/${repo}/issues/${issueRef(s.issue).number}/dependencies/blocked_by`, { method: "POST", body: { issue_id: issueRef(s.blocker).id } });
    if (s.do === "addSubIssue") gh(`repos/${repo}/issues/${issueRef(s.parent).number}/sub_issues`, { method: "POST", body: { sub_issue_id: issueRef(s.child).id } });
    if (s.do === "setParked") {
      if (s.parked) gh(`repos/${repo}/issues/${s.number}/labels`, { method: "POST", body: { labels: ["parked"] } });
      else gh(`repos/${repo}/issues/${s.number}/labels/parked`, { method: "DELETE" });
    }
    if (s.do === "moveIssue") {
      if (s.milestone) gh(`repos/${repo}/issues/${s.number}`, { method: "PATCH", body: { milestone: milestones.get(s.milestone) } });
      if (s.addLabels.length) gh(`repos/${repo}/issues/${s.number}/labels`, { method: "POST", body: { labels: s.addLabels } });
    }
    pause(s.do === "createIssue" || s.do === "foldIssue" ? PAUSE_CREATE_MS : PAUSE_WRITE_MS);
  }
};
