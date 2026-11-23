// K18 decision 1: the alert rules, derived from the model and never written by hand. A latency objective per `budget`, a defect objective per
// operation, an anomaly per refusal code, a verdict per journey and environment. Each carries the labels `environment`, its subject, `severity` and
// `owner`. The defaults are K18's and design/research/monitoring.md's: 95% of calls within the budget and 99.9% without a defect over 28 days, the
// standard burn windows (long, then short), and at least 20 calls in the short window before a burn alert fires. The portal evaluates this list and a
// sink exporter (M7.14) writes the same list; nothing else decides what is watched.
import type { AlertRuleModel, BurnAlertModel, Model } from "../types.ts";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const LATENCY = { target: 0.95, windowDays: 28 } as const;
const DEFECT = { target: 0.999, windowDays: 28 } as const;
const MIN_CALLS = 20;

const burns = (): ReadonlyArray<BurnAlertModel> => [
  { name: "fast", burn: 14.4, windowsMs: [HOUR, 5 * MIN], severity: "page" },
  { name: "slow", burn: 6, windowsMs: [6 * HOUR, 30 * MIN], severity: "page" },
  { name: "ticket", burn: 1, windowsMs: [3 * DAY, 6 * HOUR], severity: "ticket" },
];

/** The owner of an anomaly: the file of the thing whose errors declare the code, else the runtime's. */
const anomalyOwner = (model: Pick<Model, "things">, code: string): string => {
  const thing = Object.entries(model.things).find(([, t]) => Object.values(t.errors).some((e) => e.code === code))?.[0];
  return thing === undefined ? "orthograph" : `blueprint/things/${thing}/errors.ts`;
};

const byId = (a: AlertRuleModel, b: AlertRuleModel) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export const alertRulesOf = (model: Pick<Model, "operations" | "refusals" | "things" | "journeys" | "environments">): ReadonlyArray<AlertRuleModel> => [
  ...Object.entries(model.operations).filter(([, op]) => op.budget != null).map(([name, op]): AlertRuleModel => ({
    id: `latency:${name}`, kind: "latency", labels: { environment: "*", operation: name, severity: "page", owner: op.file },
    ...LATENCY, thresholdMs: op.budget!.p95Ms, minCalls: MIN_CALLS, alerts: burns(),
  })),
  ...Object.entries(model.operations).map(([name, op]): AlertRuleModel => ({
    id: `defect:${name}`, kind: "defect", labels: { environment: "*", operation: name, severity: "page", owner: op.file },
    ...DEFECT, minCalls: MIN_CALLS, alerts: burns(),
  })),
  ...Object.values(model.refusals).map((code): AlertRuleModel => ({
    id: `anomaly:${code}`, kind: "anomaly", labels: { environment: "*", code, severity: "ticket", owner: anomalyOwner(model, code) },
  })),
  ...Object.values(model.journeys).flatMap((journey) => Object.keys(model.environments ?? {}).map((environment): AlertRuleModel => ({
    id: `verdict:${journey.name}:${environment}`, kind: "verdict", labels: { environment, journey: journey.name, severity: "page", owner: journey.file },
  }))),
].sort(byId);
