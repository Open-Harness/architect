// orthograph: the declaration language projects import. `import { Blueprint } from "orthograph"`.
import { Agents } from "#modules/agents/service.js";
import { Declares } from "#modules/declare/service.js";
import { Derives } from "#modules/derive/service.js";
import { Holds } from "#modules/holds/service.js";
import { Sources } from "#modules/sources/service.js";
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
import { Plugins, Probe, Stand } from "#modules/plugins/service.js";
import { Roles } from "#modules/roles/service.js";
import { Stores } from "#modules/stores/service.js";
import { Things } from "#modules/things/service.js";
import { Clocks, Times } from "#modules/time/service.js";
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
  ...Agents,
  ...Declares,
  ...Derives,
  ...Holds,
  ...Journeys,
  ...Environments,
  ...Plugins,
  ...Secrets,
  config: Configs.config,
  time: Times,
  clock: Clocks,
  NotAllowed,
  todo: Blanks.todo,
});

export { Schema } from "effect";
/** `Source.from(adapter, mapping)` and `Source.timer` (GOAL17-source-from). */
export const Source = Sources;
export { Auth, Telemetry, Cloud, Deploy, Identity, Stand, Probe };
export { outbox, type OutboxRow } from "#modules/plugins/probes.js";
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
export type { Journey, StartingWorld, Step as JourneyStep, Call, Assertion, Script, Actor, ToolsCall, AnyCall, Ref, Refusal, ClockCall, RunnerCall, StandCall, WorldCall, TogetherCall } from "#modules/journeys/types.js";
export type { Environment, EnvironmentSpec } from "#modules/environments/types.js";
export type { Span, TimeBy, OnCalendar, Weekday, Clock } from "#modules/time/types.js";
export type { Secret } from "#modules/secrets/types.js";
export type { Identity as IdentityKind } from "#modules/identity/types.js";
export type { CloudProvider, Database } from "#modules/cloud/types.js";
export type { Deployment, Publication } from "#modules/deploy/types.js";
export type { Config, ConfigSpec, AuthKit } from "#modules/config/types.js";
export type { Sink, LocalSink, AxiomSink } from "#modules/telemetry/types.js";
export type { Feature, Adapter, Projection, Plugin, Mount, Verb, Choice, Choices, Option, OptionsIn, Need, NeedWhen, Call as AdapterCall, CallTree, AdapterEvent, AdapterDoor, EventActor, EventIdentity, CallsOf, MissingCall, MissingEvent, AnyChoice, Setting, StandIn, FeatureSpec, AdapterSpec, ProjectionSpec, ProjectedOperation, ProjectionInput, Output, ViewOf } from "#modules/plugins/types.js";
export type { Agent, AgentSpec, Slots } from "#modules/agents/types.js";
export type { Declared } from "#modules/declare/types.js";
export type { AnyDerive, Derive, Look, Looks, Problem, Problems, FoundOf } from "#modules/derive/types.js";
export type { Hold, Held, Delivery, Unheld } from "#modules/holds/types.js";
export type { On } from "#modules/events/types.js";
export type { SourceKind, SourceSpec, Connection, Mapped, Scope, AccountRef, Seen, Cells, AdmissionRow, ContextMessage, TimerConfig } from "#modules/sources/types.js";
export type { ActorForm } from "#modules/roles/types.js";
