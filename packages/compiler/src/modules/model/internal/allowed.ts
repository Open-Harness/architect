// One `allowed` entry as the model keeps it: a role is named by its export, the built-ins and the keeper by their kind.
import type { Allowed } from "orthograph";
import type { AllowedModel } from "../types.ts";

export const allowedModelOf = (roleNames: ReadonlyMap<unknown, string>, problems: Array<string>) => (a: Allowed, where: string): AllowedModel => {
  if (a.kind === "anyone" || a.kind === "signed-in" || a.kind === "keeper") return { kind: a.kind };
  const name = (r: unknown) => roleNames.get(r) ?? (problems.push(`${where}: uses a role not exported from a roles.ts`), "?");
  return a.kind === "role" ? { kind: "role", role: name(a) } : { kind: "role-of", role: name(a.role), path: a.path };
};
