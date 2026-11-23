// Reads and writes the "Orthograph" Project through GitHub's GraphQL API (K33). `project.mjs` decides; this does.
// The Project needs the token's `project` scope; `hasProjectScope` says whether it has it, never the token.
import { execFileSync } from "node:child_process";
import { PAUSE_PROJECT_MS, pause, withRetry } from "./pace.mjs";
import { PROJECT_TITLE, projectPlan } from "./project.mjs";

const graphql = (query, variables = {}) =>
  withRetry(() => {
    const out = execFileSync("gh", ["api", "graphql", "--input", "-"], { input: JSON.stringify({ query, variables }), encoding: "utf8", maxBuffer: 64 << 20, stdio: ["pipe", "pipe", "pipe"] });
    const json = JSON.parse(out);
    const said = json.errors ? json.errors.map((e) => e.message).join("; ") : "";
    // A rate-limit refusal is waited out and tried again; any other GraphQL error ends the run with its message and
    // exit code 4, and the next run picks up from what was written.
    if (/rate limit|too quickly/i.test(said)) throw new Error(said);
    if (json.errors) {
      process.stderr.write(`GitHub refused a Project call: ${said}\n`);
      process.exit(4);
    }
    return json.data;
  });

/** The signed-in token's scopes, from the scope header only (never the token). Empty for a token without one. */
export const tokenScopes = () => {
  // Null when they cannot be read at all: an installation token has no `user` to ask about.
  try {
    const head = execFileSync("gh", ["api", "-i", "user"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\r\n\r\n")[0];
    return new Set((/^x-oauth-scopes:\s*(.*)$/im.exec(head)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  } catch {
    return null;
  }
};
export const hasProjectScope = () => tokenScopes()?.has("project") ?? false;

const FIELDS = `fields(first: 50) { nodes {
  ... on ProjectV2FieldCommon { id name dataType }
  ... on ProjectV2SingleSelectField { options { id name color description } } } }`;
const VALUES = `fieldValues(first: 20) { nodes {
  ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
  ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } }
  ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2FieldCommon { name } } } } }`;

/** The Project as `projectPlan` wants it, read by its id (a fresh id needs no listing to catch up). */
const readById = (id, url, repo) => {
  const { node } = graphql(`query($id: ID!) { node(id: $id) { ... on ProjectV2 { ${FIELDS} views(first: 50) { nodes { id name layout filter } }
    repositories(first: 50) { nodes { nameWithOwner } } } } }`, { id });
  const items = [];
  for (let after = null; ; ) {
    const page = graphql(
      `query($id: ID!, $after: String) { node(id: $id) { ... on ProjectV2 { items(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor } nodes { id content { ... on Issue { number repository { nameWithOwner } } } ${VALUES} } } } } }`,
      { id, after },
    ).node.items;
    for (const n of page.nodes) {
      if (n.content?.repository?.nameWithOwner !== repo) continue;
      items.push({ id: n.id, number: n.content.number, values: Object.fromEntries(n.fieldValues.nodes.filter((v) => v.field).map((v) => [v.field.name, v.name ?? v.text ?? v.date])) });
    }
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return {
    url,
    linked: node.repositories.nodes.some((r) => r.nameWithOwner === repo),
    project: { id, fields: node.fields.nodes.filter((f) => f.id).map((f) => ({ ...f, options: f.options ?? [] })), items, views: node.views.nodes },
  };
};

/** The owner (a person or an organization), and its Project of that title, or null when it has none. */
export const readProject = (owner, repo) => {
  const { repositoryOwner } = graphql(`query($login: String!) { repositoryOwner(login: $login) { id __typename
    ... on ProjectV2Owner { projectsV2(first: 50) { nodes { id title url } } } } }`, { login: owner });
  const found = repositoryOwner.projectsV2.nodes.find((p) => p.title === PROJECT_TITLE);
  const base = { ownerId: repositoryOwner.id, ownerType: repositoryOwner.__typename };
  return found ? { ...base, ...readById(found.id, found.url, repo) } : { ...base, project: null };
};

/**
 * Applies the plan. It creates the Project when it is missing, links it to the repository on every run until it is
 * linked (so a failed link is mended next time), and reads it by id between phases.
 */
export const applyProject = ({ owner, repo, goals, issues, log, rows, dates }) => {
  let read = readProject(owner, repo);
  if (!read.project) {
    const { createProjectV2 } = graphql(`mutation($o: ID!, $t: String!) { createProjectV2(input: { ownerId: $o, title: $t }) { projectV2 { id url } } }`, { o: read.ownerId, t: PROJECT_TITLE });
    log("did createProject Orthograph");
    read = { ...read, ...readById(createProjectV2.projectV2.id, createProjectV2.projectV2.url, repo) };
  }
  if (!read.linked) {
    const { repository } = graphql(`query($o: String!, $n: String!) { repository(owner: $o, name: $n) { id } }`, { o: owner, n: repo.split("/")[1] });
    graphql(`mutation($p: ID!, $r: ID!) { linkProjectV2ToRepository(input: { projectId: $p, repositoryId: $r }) { repository { id } } }`, { p: read.project.id, r: repository.id });
    log("did linkRepository");
  }
  const pid = read.project.id;
  const fieldId = (name) => read.project.fields.find((f) => f.name === name)?.id;
  const optionId = (name, value) => read.project.fields.find((f) => f.name === name)?.options.find((o) => o.name === value)?.id;
  const itemId = new Map(read.project.items.map((i) => [i.number, i.id]));
  const nodeId = new Map(issues.map((i) => [i.number, i.nodeId]));

  // Fields first, then read again, so item values can name the options' ids.
  const plan = projectPlan({ goals, issues, project: read.project, rows, dates });
  for (const s of plan.filter((x) => x.do === "createField" || x.do === "updateField")) {
    const options = s.options.map(({ id, name, color, description }) => ({ ...(id ? { id } : {}), name, color, description: description ?? "" }));
    if (s.do === "createField") {
      graphql(`mutation($p: ID!, $n: String!, $d: ProjectV2CustomFieldType!, $o: [ProjectV2SingleSelectFieldOptionInput!]) {
        createProjectV2Field(input: { projectId: $p, name: $n, dataType: $d, singleSelectOptions: $o }) { clientMutationId } }`,
        { p: pid, n: s.name, d: s.dataType, o: s.dataType === "SINGLE_SELECT" ? options : null });
    } else {
      graphql(`mutation($f: ID!, $o: [ProjectV2SingleSelectFieldOptionInput!]) { updateProjectV2Field(input: { fieldId: $f, singleSelectOptions: $o }) { clientMutationId } }`,
        { f: fieldId(s.name), o: options });
    }
    log(`did ${s.do} ${s.name}`);
  }
  read = { ...read, ...readById(pid, read.url, repo) };
  for (const s of projectPlan({ goals, issues, project: read.project, rows, dates }).filter((x) => x.do !== "createField" && x.do !== "updateField")) {
    if (s.do === "addItem") {
      const { addProjectV2ItemById } = graphql(`mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: { projectId: $p, contentId: $c }) { item { id } } }`, { p: pid, c: nodeId.get(s.number) });
      itemId.set(s.number, addProjectV2ItemById.item.id);
    }
    if (s.do === "setValue") {
      const kind = read.project.fields.find((f) => f.name === s.field)?.dataType;
      const value = kind === "TEXT" ? { text: s.value } : kind === "DATE" ? { date: s.value } : { singleSelectOptionId: optionId(s.field, s.value) };
      graphql(`mutation($p: ID!, $i: ID!, $f: ID!, $v: ProjectV2FieldValue!) { updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: $v }) { clientMutationId } }`,
        { p: pid, i: itemId.get(s.number), f: fieldId(s.field), v: value });
    }
    if (s.do === "clearValue") {
      graphql(`mutation($p: ID!, $i: ID!, $f: ID!) { clearProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f }) { clientMutationId } }`,
        { p: pid, i: itemId.get(s.number), f: fieldId(s.field) });
    }
    if (s.do === "createView") {
      const { createProjectV2View } = graphql(`mutation($p: ID!, $n: String!, $l: ProjectV2ViewLayout!) { createProjectV2View(input: { projectId: $p, name: $n, layout: $l }) { projectV2View { id } } }`, { p: pid, n: s.name, l: s.layout });
      if (s.filter) graphql(`mutation($v: ID!, $q: String!) { updateProjectV2View(input: { viewId: $v, filter: $q }) { clientMutationId } }`, { v: createProjectV2View.projectV2View.id, q: s.filter });
    }
    if (s.do === "updateView") {
      graphql(`mutation($v: ID!, $n: String!, $l: ProjectV2ViewLayout!, $q: String!) { updateProjectV2View(input: { viewId: $v, name: $n, layout: $l, filter: $q }) { clientMutationId } }`,
        { v: s.id, n: s.name, l: s.layout, q: s.filter });
    }
    log(`did ${s.do} ${s.title ?? s.name ?? ""}`);
    pause(PAUSE_PROJECT_MS);
  }
  return read.url;
};
