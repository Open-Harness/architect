import { Schema, Source } from "orthograph";
import posthog from "@orthograph/posthog";
import { AccountRef, inferredOnly } from "../../src/modules/source/types.ts";

/** Where PostHog's issue is read back from: the project and the issue. Nothing is ever posted to PostHog. */
interface Address { readonly project: string; readonly issue: string }
interface Alert { readonly project: { readonly id: string }; readonly issue: { readonly id: string; readonly name: string; readonly description?: string | null; readonly url: string } }
interface Issue { readonly id: string; readonly name?: string; readonly description?: string | null; readonly first_seen?: string }

/** The PostHog connection: an error alert in a project is a trigger on the issue's own thread, and a resolve closes it. PostHog has no sender, so the gate's "unnamed" cell admits it (GOAL17-connections D, E). */
const Config = Schema.Struct({ me: AccountRef, project: Schema.String, kinds: Schema.Array(Schema.Literals(["errorIssue"])) });

export const posthogSource = Source.from<typeof posthog, typeof Config.Type, Address>(posthog, {
  config: Config,
  scope: (c, m) => ({ listened: m.channel.project === c.project && c.kinds.some((k) => k === m.kind), observed: true, row: "posthog" }),
  on: {
    errorAlert: (raw) => {
      const e = raw as Alert;
      return {
        kind: "errorIssue", thread: `error/${e.issue.id}`, text: `${e.issue.name}: ${e.issue.description ?? ""}`, url: e.issue.url,
        channel: { project: e.project.id, issue: e.issue.id },
      };
    },
  },
  closed: { errorResolved: (raw) => `error/${(raw as Alert).issue.id}` },
  history: {
    call: posthog.calls.errorTrackingIssuesRetrieve,
    args: (a) => ({ project_id: a.project, id: a.issue }),
    page: (answer) => {
      const issue = answer as Issue;
      return { messages: [{ id: issue.id, from: "", at: issue.first_seen ?? "", text: `${issue.name ?? ""}: ${issue.description ?? ""}` }] };
    },
  },
  policyPart: { schema: Schema.Struct({}), rows: () => [{ id: "posthog", label: "PostHog", cells: inferredOnly }] },
  environment: {
    variables: { POSTHOG_PROJECT: "the PostHog project the error is in", POSTHOG_ISSUE: "the id of the error tracking issue" },
    of: (m) => ({ POSTHOG_PROJECT: m.channel.project, POSTHOG_ISSUE: m.channel.issue }),
  },
});
