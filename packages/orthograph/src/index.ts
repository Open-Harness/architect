// orthograph: the declaration language projects import. `import { Blueprint } from "orthograph"`.
import { Blanks } from "#modules/blanks/service.js";
import { Cloud } from "#modules/cloud/service.js";
import { Auth, Configs } from "#modules/config/service.js";
import { Telemetry } from "#modules/telemetry/service.js";
import { Deploy } from "#modules/deploy/service.js";
import { Environments } from "#modules/environments/service.js";
import { Identity } from "#modules/identity/service.js";
import { Secrets } from "#modules/secrets/service.js";
import { Errors } from "#modules/errors/service.js";
import { Events } from "#modules/events/service.js";
import { Checks, Journeys } from "#modules/journeys/service.js";
import { NotAllowed } from "#modules/errors/types.js";
import { Invariants } from "#modules/invariants/service.js";
import { Machines } from "#modules/machines/service.js";
import { Operations } from "#modules/operations/service.js";
import { Plugins, Stand } from "#modules/plugins/service.js";
import { Roles } from "#modules/roles/service.js";
import { Stores } from "#modules/stores/service.js";
import { Things } from "#modules/things/service.js";
import { Values } from "#modules/values/service.js";
import { Visibilities } from "#modules/visibility/service.js";

export const Blueprint = Object.freeze({
  ...Values,
  ...Visibilities,
  ...Things,
  ...Stores,
  ...Events,
  ...Errors,
  ...Machines,
  ...Invariants,
  ...Roles,
  ...Operations,
  ...Journeys,
  ...Environments,
  ...Plugins,
  ...Secrets,
  config: Configs.config,
  NotAllowed,
  todo: Blanks.todo,
});

export { Schema } from "effect";
export { Auth, Telemetry, Cloud, Deploy, Identity, Stand };
export { Via, Host, Door, Ships } from "#modules/plugins/types.js";
export const { expect, emits, noEvents, refuses, spans, lacks, has } = Checks;
export { NotAllowed } from "#modules/errors/types.js";
export type { Value, ValueMeta, TypeOf } from "#modules/values/types.js";
export type { Visibility, PrivateTo } from "#modules/visibility/types.js";
export type { Thing, Field, FieldInput, FieldsInput, Lives, StoreKind, NotFound } from "#modules/things/types.js";
export type { Store } from "#modules/stores/types.js";
export type { Event } from "#modules/events/types.js";
export type { BlueprintError, ErrorClass, AnyErrorClass } from "#modules/errors/types.js";
export type { Unique, Invariant, KeyOf, UniqueOptions } from "#modules/invariants/types.js";
export type { Machine, Move, NotFrom, State } from "#modules/machines/types.js";
export { acting } from "#modules/roles/types.js";
export { admitsAgent } from "#modules/roles/service.js";
export type { Role, RoleOf, ServiceRole, SignedIn, System, Narrowed, Allowed, Principal, Acting, Way, InstanceOf } from "#modules/roles/types.js";
export type { Operation, Read, ReadAnswer, Order, Page, ListPayload, ListItem, Steps, OperationSpec, Step, CallStep, StepKind, Runs, TestKind, Budget, PayloadOf, AnswerOf, ErrorOf, StepsOf } from "#modules/operations/types.js";
export type { Blank } from "#modules/blanks/types.js";
export type { Journey, StartingWorld, Step as JourneyStep, Call, Assertion, Script, Actor, ToolsCall, AnyCall, Ref, Refusal } from "#modules/journeys/types.js";
export type { Environment, EnvironmentSpec } from "#modules/environments/types.js";
export type { Secret } from "#modules/secrets/types.js";
export type { Identity as IdentityKind } from "#modules/identity/types.js";
export type { CloudProvider, Database } from "#modules/cloud/types.js";
export type { Deployment, Publication } from "#modules/deploy/types.js";
export type { Config, ConfigSpec, AuthKit } from "#modules/config/types.js";
export type { Sink, LocalSink, AxiomSink } from "#modules/telemetry/types.js";
export type { Feature, Adapter, Projection, Plugin, Mount, Verb, Choice, Choices, Option, OptionsIn, Need, NeedWhen, Call as AdapterCall, CallsOf, MissingCall, AnyChoice, Setting, StandIn, FeatureSpec, AdapterSpec, ProjectionSpec, ProjectedOperation, ProjectionInput, Output, ViewOf } from "#modules/plugins/types.js";
