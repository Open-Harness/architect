// Generated from blueprint/projections/app.ts. Do not edit.

/** The address of each page of the app, by the page's name. */
export const links = {
  access: (): string => "/portal/reference/access",
  compare: (): string => "/portal/compare",
  environment: (params: { readonly name: string }): string => "/portal/environments/" + encodeURIComponent(params.name),
  events: (): string => "/portal/reference/events",
  home: (): string => "/portal",
  journeys: (): string => "/portal/journeys",
  machines: (): string => "/portal/reference/machines",
  monitor: (): string => "/portal/monitor",
  operation: (params: { readonly name: string }): string => "/portal/operations/" + encodeURIComponent(params.name),
  plugins: (): string => "/portal/plugins",
  refusals: (): string => "/portal/reference/refusals",
  thing: (params: { readonly name: string }): string => "/portal/things/" + encodeURIComponent(params.name),
  trace: (params: { readonly id: string }): string => "/portal/traces/" + encodeURIComponent(params.id),
  values: (): string => "/portal/reference/values",
  worlds: (): string => "/portal/starting-worlds",
} as const;
