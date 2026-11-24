// Generated from the blueprint. Do not edit.
// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.
import { Context, Effect, Layer } from "effect";
import { ManagedRuntime, Tracer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import type { Principal } from "orthograph";
import { AuthD1, Database, JournalD1, StoreD1, Telemetry, toWorld } from "@orthograph/host-cloudflare";
import { Auth, Busy, BusyLive, CallTelemetry, Environment, Handlers, Journal, Principals, Reads, Store, Wire, invariantsIn, thingIn } from "@orthograph/language-effect";
import { Mcp, type McpResult, type ShownOperation } from "@orthograph/language-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as portal from "../portal/main.ts";
import { catalog } from "../mcp/src/index.ts";
import * as bankAccountClose from "../api/src/bank-account/close.ts";
import * as bankAccountGet from "../api/src/bank-account/get.ts";
import * as bankAccountOpen from "../api/src/bank-account/open.ts";
import * as branchCreate from "../api/src/branch/create.ts";
import * as branchGet from "../api/src/branch/get.ts";
import * as bridgeBusinessApprove from "../api/src/bridge-business/approve.ts";
import * as bridgeBusinessGet from "../api/src/bridge-business/get.ts";
import * as bridgeBusinessReject from "../api/src/bridge-business/reject.ts";
import * as bridgeBusinessStart from "../api/src/bridge-business/start.ts";
import * as bridgeIndividualApprove from "../api/src/bridge-individual/approve.ts";
import * as bridgeIndividualGet from "../api/src/bridge-individual/get.ts";
import * as bridgeIndividualReject from "../api/src/bridge-individual/reject.ts";
import * as bridgeIndividualStart from "../api/src/bridge-individual/start.ts";
import * as companyCreate from "../api/src/company/create.ts";
import * as companyGet from "../api/src/company/get.ts";
import * as departmentCreate from "../api/src/department/create.ts";
import * as departmentGet from "../api/src/department/get.ts";
import * as designationCreate from "../api/src/designation/create.ts";
import * as designationGet from "../api/src/designation/get.ts";
import * as employeeGet from "../api/src/employee/get.ts";
import * as employeeHire from "../api/src/employee/hire.ts";
import * as employeeRelieve from "../api/src/employee/relieve.ts";
import * as employeeGradeCreate from "../api/src/employee-grade/create.ts";
import * as employeeGradeGet from "../api/src/employee-grade/get.ts";
import * as holidayAdd from "../api/src/holiday/add.ts";
import * as holidayGet from "../api/src/holiday/get.ts";
import * as holidayListAddWeeklyOff from "../api/src/holiday-list/add-weekly-off.ts";
import * as holidayListCreate from "../api/src/holiday-list/create.ts";
import * as holidayListGet from "../api/src/holiday-list/get.ts";
import bankAccountCloseHandler from "../../src/bank-account/close.ts";
import bankAccountOpenHandler from "../../src/bank-account/open.ts";
import branchCreateHandler from "../../src/branch/create.ts";
import bridgeBusinessApproveHandler from "../../src/bridge-business/approve.ts";
import bridgeBusinessRejectHandler from "../../src/bridge-business/reject.ts";
import bridgeBusinessStartHandler from "../../src/bridge-business/start.ts";
import bridgeIndividualApproveHandler from "../../src/bridge-individual/approve.ts";
import bridgeIndividualRejectHandler from "../../src/bridge-individual/reject.ts";
import bridgeIndividualStartHandler from "../../src/bridge-individual/start.ts";
import companyCreateHandler from "../../src/company/create.ts";
import departmentCreateHandler from "../../src/department/create.ts";
import designationCreateHandler from "../../src/designation/create.ts";
import employeeHireHandler from "../../src/employee/hire.ts";
import employeeRelieveHandler from "../../src/employee/relieve.ts";
import employeeGradeCreateHandler from "../../src/employee-grade/create.ts";
import holidayAddHandler from "../../src/holiday/add.ts";
import holidayListAddWeeklyOffHandler from "../../src/holiday-list/add-weekly-off.ts";
import holidayListCreateHandler from "../../src/holiday-list/create.ts";
import * as bankAccountThing from "../../blueprint/things/bank-account/thing.ts";
import * as branchThing from "../../blueprint/things/branch/thing.ts";
import * as bridgeBusinessThing from "../../blueprint/things/bridge-business/thing.ts";
import * as bridgeIndividualThing from "../../blueprint/things/bridge-individual/thing.ts";
import * as companyThing from "../../blueprint/things/company/thing.ts";
import * as departmentThing from "../../blueprint/things/department/thing.ts";
import * as designationThing from "../../blueprint/things/designation/thing.ts";
import * as employeeThing from "../../blueprint/things/employee/thing.ts";
import * as employeeGradeThing from "../../blueprint/things/employee-grade/thing.ts";
import * as holidayThing from "../../blueprint/things/holiday/thing.ts";
import * as holidayListThing from "../../blueprint/things/holiday-list/thing.ts";
import * as bankAccountInvariants from "../../blueprint/things/bank-account/invariants.ts";
import * as branchInvariants from "../../blueprint/things/branch/invariants.ts";
import * as bridgeBusinessInvariants from "../../blueprint/things/bridge-business/invariants.ts";
import * as bridgeIndividualInvariants from "../../blueprint/things/bridge-individual/invariants.ts";
import * as companyInvariants from "../../blueprint/things/company/invariants.ts";
import * as departmentInvariants from "../../blueprint/things/department/invariants.ts";
import * as designationInvariants from "../../blueprint/things/designation/invariants.ts";
import * as employeeInvariants from "../../blueprint/things/employee/invariants.ts";
import * as employeeGradeInvariants from "../../blueprint/things/employee-grade/invariants.ts";
import * as holidayInvariants from "../../blueprint/things/holiday/invariants.ts";
import * as holidayListInvariants from "../../blueprint/things/holiday-list/invariants.ts";

export { World } from "@orthograph/host-cloudflare";

const bankAccountCloseServed = Handlers.serve({ name: "bank-account.close", operation: bankAccountClose.declaration, handler: bankAccountCloseHandler, notFrom: "BankAccountNotOpen", codes: Errors.codes });
const bankAccountGetServed = Reads.serve({ name: "bank-account.get", read: bankAccountGet.declaration });
const bankAccountOpenServed = Handlers.serve({ name: "bank-account.open", operation: bankAccountOpen.declaration, handler: bankAccountOpenHandler, invariants: { BankAccountNameTaken: "bank-account.oneNamePerCompany" }, codes: Errors.codes });
const branchCreateServed = Handlers.serve({ name: "branch.create", operation: branchCreate.declaration, handler: branchCreateHandler, invariants: { BranchNameTaken: "branch.oneNamePerCompany" }, codes: Errors.codes });
const branchGetServed = Reads.serve({ name: "branch.get", read: branchGet.declaration });
const bridgeBusinessApproveServed = Handlers.serve({ name: "bridge-business.approve", operation: bridgeBusinessApprove.declaration, handler: bridgeBusinessApproveHandler, notFrom: "BridgeBusinessNotStarted", notFound: { business: "BridgeBusinessNotFound" }, invariants: { KybAlreadyStarted: "bridge-business.oneKybPerCompany" }, codes: Errors.codes });
const bridgeBusinessGetServed = Reads.serve({ name: "bridge-business.get", read: bridgeBusinessGet.declaration });
const bridgeBusinessRejectServed = Handlers.serve({ name: "bridge-business.reject", operation: bridgeBusinessReject.declaration, handler: bridgeBusinessRejectHandler, notFrom: "BridgeBusinessNotStarted", notFound: { business: "BridgeBusinessNotFound" }, invariants: { KybAlreadyStarted: "bridge-business.oneKybPerCompany" }, codes: Errors.codes });
const bridgeBusinessStartServed = Handlers.serve({ name: "bridge-business.start", operation: bridgeBusinessStart.declaration, handler: bridgeBusinessStartHandler, invariants: { KybAlreadyStarted: "bridge-business.oneKybPerCompany" }, codes: Errors.codes });
const bridgeIndividualApproveServed = Handlers.serve({ name: "bridge-individual.approve", operation: bridgeIndividualApprove.declaration, handler: bridgeIndividualApproveHandler, notFrom: "BridgeIndividualNotStarted", notFound: { individual: "BridgeIndividualNotFound" }, invariants: { KycAlreadyStarted: "bridge-individual.oneKycPerPerson" }, codes: Errors.codes });
const bridgeIndividualGetServed = Reads.serve({ name: "bridge-individual.get", read: bridgeIndividualGet.declaration });
const bridgeIndividualRejectServed = Handlers.serve({ name: "bridge-individual.reject", operation: bridgeIndividualReject.declaration, handler: bridgeIndividualRejectHandler, notFrom: "BridgeIndividualNotStarted", notFound: { individual: "BridgeIndividualNotFound" }, invariants: { KycAlreadyStarted: "bridge-individual.oneKycPerPerson" }, codes: Errors.codes });
const bridgeIndividualStartServed = Handlers.serve({ name: "bridge-individual.start", operation: bridgeIndividualStart.declaration, handler: bridgeIndividualStartHandler, invariants: { KycAlreadyStarted: "bridge-individual.oneKycPerPerson" }, codes: Errors.codes });
const companyCreateServed = Handlers.serve({ name: "company.create", operation: companyCreate.declaration, handler: companyCreateHandler, invariants: { CompanyAbbrTaken: "company.oneAbbrPerOwner", CompanyNameTaken: "company.oneNamePerOwner" }, codes: Errors.codes });
const companyGetServed = Reads.serve({ name: "company.get", read: companyGet.declaration });
const departmentCreateServed = Handlers.serve({ name: "department.create", operation: departmentCreate.declaration, handler: departmentCreateHandler, invariants: { DepartmentNameTaken: "department.oneNamePerCompany" }, codes: Errors.codes });
const departmentGetServed = Reads.serve({ name: "department.get", read: departmentGet.declaration });
const designationCreateServed = Handlers.serve({ name: "designation.create", operation: designationCreate.declaration, handler: designationCreateHandler, invariants: { DesignationNameTaken: "designation.oneNamePerCompany" }, codes: Errors.codes });
const designationGetServed = Reads.serve({ name: "designation.get", read: designationGet.declaration });
const employeeGetServed = Reads.serve({ name: "employee.get", read: employeeGet.declaration });
const employeeHireServed = Handlers.serve({ name: "employee.hire", operation: employeeHire.declaration, handler: employeeHireHandler, notFound: { department: "DepartmentNotFound", designation: "DesignationNotFound" }, invariants: { EmployeeAlreadyHired: "employee.onePlacePerPerson" }, codes: Errors.codes });
const employeeRelieveServed = Handlers.serve({ name: "employee.relieve", operation: employeeRelieve.declaration, handler: employeeRelieveHandler, notFrom: "EmployeeNotActive", codes: Errors.codes });
const employeeGradeCreateServed = Handlers.serve({ name: "employee-grade.create", operation: employeeGradeCreate.declaration, handler: employeeGradeCreateHandler, invariants: { EmployeeGradeNameTaken: "employee-grade.oneNamePerCompany" }, codes: Errors.codes });
const employeeGradeGetServed = Reads.serve({ name: "employee-grade.get", read: employeeGradeGet.declaration });
const holidayAddServed = Handlers.serve({ name: "holiday.add", operation: holidayAdd.declaration, handler: holidayAddHandler, invariants: { HolidayDateTaken: "holiday.oneHolidayPerDay", HolidayListNameTaken: "holiday-list.oneNamePerCompany" }, codes: Errors.codes });
const holidayGetServed = Reads.serve({ name: "holiday.get", read: holidayGet.declaration });
const holidayListAddWeeklyOffServed = Handlers.serve({ name: "holiday-list.add-weekly-off", operation: holidayListAddWeeklyOff.declaration, handler: holidayListAddWeeklyOffHandler, notFrom: "HolidayListNotActive", invariants: { HolidayDateTaken: "holiday.oneHolidayPerDay", HolidayListNameTaken: "holiday-list.oneNamePerCompany" }, codes: Errors.codes });
const holidayListCreateServed = Handlers.serve({ name: "holiday-list.create", operation: holidayListCreate.declaration, handler: holidayListCreateHandler, invariants: { HolidayListNameTaken: "holiday-list.oneNamePerCompany" }, codes: Errors.codes });
const holidayListGetServed = Reads.serve({ name: "holiday-list.get", read: holidayListGet.declaration });

/** Each thing and its table: a D1 table, or the name its actors go by. */
const tables = [[thingIn(bankAccountThing), "bank-account"], [thingIn(branchThing), "branch"], [thingIn(bridgeBusinessThing), "bridge-business"], [thingIn(bridgeIndividualThing), "bridge-individual"], [thingIn(companyThing), "company"], [thingIn(departmentThing), "department"], [thingIn(designationThing), "designation"], [thingIn(employeeThing), "employee"], [thingIn(employeeGradeThing), "employee-grade"], [thingIn(holidayThing), "holiday"], [thingIn(holidayListThing), "holiday-list"]] as const;

/** Each rule (G5) under its full name, `<thing>.<rule>`: the store's index refuses a second holder at commit, and the runtime refuses before it. */
const rules = [...invariantsIn("bank-account", bankAccountInvariants), ...invariantsIn("branch", branchInvariants), ...invariantsIn("bridge-business", bridgeBusinessInvariants), ...invariantsIn("bridge-individual", bridgeIndividualInvariants), ...invariantsIn("company", companyInvariants), ...invariantsIn("department", departmentInvariants), ...invariantsIn("designation", designationInvariants), ...invariantsIn("employee", employeeInvariants), ...invariantsIn("employee-grade", employeeGradeInvariants), ...invariantsIn("holiday", holidayInvariants), ...invariantsIn("holiday-list", holidayListInvariants)] as const;

const refusals = Wire.refusals(Errors.wire);
const CallApi = Api.middleware(CallTelemetry);
type Services = SqlClient.SqlClient | Store | Busy | Principals | Journal | Auth;

/** Who is calling, then the operation or read, its refusals sent as their wire classes. */
type Run = (payload: never, principal: Principal, request?: string) => Effect.Effect<unknown, unknown, unknown>;
/** Every answer and every refusal is cut by the visibility rule for this caller before it is sent. */
const shown = Wire.shown(Errors.declared);
const call = <P extends object>(served: { readonly run: Run; readonly operation: ShownOperation }, payload: P, headers: Readonly<Record<string, string | undefined>>) =>
  Effect.flatMap(Principals, (principals) => principals.of(headers["authorization"])).pipe(
    Effect.withTracerEnabled(false),
    // The caller's idempotency key: for an operation declared `idempotent: "request"`, the same key is one call.
    Effect.flatMap((principal: Principal) => served.run(payload as never, principal, headers["idempotency-key"]).pipe(shown(served, payload, principal))),
    refusals,
  ) as Effect.Effect<never, never, Services>;

const BankAccountLive = HttpApiBuilder.group(CallApi, "bank-account", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("close", ({ payload, request }) => call(bankAccountCloseServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(bankAccountGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("open", ({ payload, request }) => call(bankAccountOpenServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const BranchLive = HttpApiBuilder.group(CallApi, "branch", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(branchCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(branchGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const BridgeBusinessLive = HttpApiBuilder.group(CallApi, "bridge-business", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("approve", ({ payload, request }) => call(bridgeBusinessApproveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(bridgeBusinessGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(bridgeBusinessRejectServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("start", ({ payload, request }) => call(bridgeBusinessStartServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const BridgeIndividualLive = HttpApiBuilder.group(CallApi, "bridge-individual", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("approve", ({ payload, request }) => call(bridgeIndividualApproveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(bridgeIndividualGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(bridgeIndividualRejectServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("start", ({ payload, request }) => call(bridgeIndividualStartServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const CompanyLive = HttpApiBuilder.group(CallApi, "company", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(companyCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(companyGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const DepartmentLive = HttpApiBuilder.group(CallApi, "department", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(departmentCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(departmentGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const DesignationLive = HttpApiBuilder.group(CallApi, "designation", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(designationCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(designationGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EmployeeLive = HttpApiBuilder.group(CallApi, "employee", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(employeeGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("hire", ({ payload, request }) => call(employeeHireServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("relieve", ({ payload, request }) => call(employeeRelieveServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EmployeeGradeLive = HttpApiBuilder.group(CallApi, "employee-grade", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(employeeGradeCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(employeeGradeGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const HolidayLive = HttpApiBuilder.group(CallApi, "holiday", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("add", ({ payload, request }) => call(holidayAddServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(holidayGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const HolidayListLive = HttpApiBuilder.group(CallApi, "holiday-list", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("add-weekly-off", ({ payload, request }) => call(holidayListAddWeeklyOffServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(holidayListCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(holidayListGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));

export interface Env {
  readonly DB: D1Database;
  readonly WORLD: DurableObjectNamespace;
  /** Better Auth's secret, at least 32 characters: fresh per local world, a named secret per environment. */
  readonly AUTH_SECRET: string;
  readonly OTLP_URL?: string;
  /** The environment's telemetry sinks beside the collector, as JSON: each one's OTLP endpoints and headers. A secret. */
  readonly OTLP_SINKS?: string;
  /** The environment's name, written on every span as `deployment.environment`: `local` for a world of dev or prove. */
  readonly ORTHO_ENVIRONMENT?: string;
  /** Which build this environment runs, set by `ortho env up`; unset for a world made by `ortho dev` or prove. */
  readonly ORTHO_REVISION?: string;
  readonly ORTHO_BUNDLE_SHA256?: string;
  /** The portal's: where the logbook is, which environment this is. Read by `portal.serve`; neither is sent to a browser. */
  readonly ORTHO_LOGBOOK_URL?: string;
  /** `1` in an environment that hosts worlds with lifetimes (a test environment), set by `ortho env up`. */
  readonly ORTHO_WORLDS?: string;
}

/** Which steps each operation runs, by the operation's name: the server's own record, never in the API package (the caller's contract names no step, K14). */
export const steps = {
  "bank-account.close": ["bank-account.close.update"],
  "bank-account.open": ["bank-account.open.load", "bank-account.open.insert"],
  "branch.create": ["branch.create.insert"],
  "bridge-business.approve": ["bridge-business.approve.update"],
  "bridge-business.reject": ["bridge-business.reject.update"],
  "bridge-business.start": ["bridge-business.start.insert"],
  "bridge-individual.approve": ["bridge-individual.approve.update"],
  "bridge-individual.reject": ["bridge-individual.reject.update"],
  "bridge-individual.start": ["bridge-individual.start.insert"],
  "company.create": ["company.create.insert"],
  "department.create": ["department.create.insert"],
  "designation.create": ["designation.create.insert"],
  "employee.hire": ["employee.hire.load", "employee.hire.insert"],
  "employee.relieve": ["employee.relieve.load", "employee.relieve.update"],
  "employee-grade.create": ["employee-grade.create.insert"],
  "holiday.add": ["holiday.add.load", "holiday.add.insert"],
  "holiday-list.add-weekly-off": ["holiday-list.add-weekly-off.load", "holiday-list.add-weekly-off.record"],
  "holiday-list.create": ["holiday-list.create.insert"],
} as const;

// Better Auth's own routes at /api/auth/*: the device sign-in of this project's CLI. Same database and secret as the
// layer's instance, so a session either one issues is a person to both.
let routes: ReturnType<typeof AuthD1.make> | undefined;
const routesOf = (env: Env) => (routes ??= AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, cli: "capxul-cli", worlds: hostsWorlds(env) }));

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(CallApi).pipe(
      Layer.provide([BankAccountLive, BranchLive, BridgeBusinessLive, BridgeIndividualLive, CompanyLive, DepartmentLive, DesignationLive, EmployeeLive, EmployeeGradeLive, HolidayLive, HolidayListLive]),
      Layer.provideMerge(CallTelemetry.layer),
      Layer.provide([StoreD1.layer({ tables, rules }), JournalD1.layer, BusyLive, Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))]),
      Layer.provideMerge(Database.d1(env.DB)),
      Layer.provide(HttpServer.layerServices),
    ),
  );

// Built once per isolate, from the first request's bindings.
let built: ReturnType<typeof build> | undefined;

/** The environments of the blueprint that host worlds: those that declare a `lifetime` (D3 #126). */
const WORLD_ENVIRONMENTS: ReadonlyArray<string> = [];

/**
 * `/_world/*` (the cast that signs people up with known passwords, the facts, the registry of worlds) answers only where
 * worlds live: a world made by `ortho dev` or prove (`local`, or no environment), and an environment that declares a lifetime and
 * was started to host worlds. Anywhere else, staging and production included, it is a 404 before any handler runs.
 */
const hostsWorlds = (env: Env) =>
  !env.ORTHO_ENVIRONMENT || env.ORTHO_ENVIRONMENT === "local" || (env.ORTHO_WORLDS === "1" && WORLD_ENVIRONMENTS.includes(env.ORTHO_ENVIRONMENT));

/** One tool per operation and read: the same served operations as the API, called as the person the access token names. */
const tools = Mcp.tools<Services>({
  catalog,
  served: { "bank-account.close": bankAccountCloseServed, "bank-account.get": bankAccountGetServed, "bank-account.open": bankAccountOpenServed, "branch.create": branchCreateServed, "branch.get": branchGetServed, "bridge-business.approve": bridgeBusinessApproveServed, "bridge-business.get": bridgeBusinessGetServed, "bridge-business.reject": bridgeBusinessRejectServed, "bridge-business.start": bridgeBusinessStartServed, "bridge-individual.approve": bridgeIndividualApproveServed, "bridge-individual.get": bridgeIndividualGetServed, "bridge-individual.reject": bridgeIndividualRejectServed, "bridge-individual.start": bridgeIndividualStartServed, "company.create": companyCreateServed, "company.get": companyGetServed, "department.create": departmentCreateServed, "department.get": departmentGetServed, "designation.create": designationCreateServed, "designation.get": designationGetServed, "employee.get": employeeGetServed, "employee.hire": employeeHireServed, "employee.relieve": employeeRelieveServed, "employee-grade.create": employeeGradeCreateServed, "employee-grade.get": employeeGradeGetServed, "holiday.add": holidayAddServed, "holiday.get": holidayGetServed, "holiday-list.add-weekly-off": holidayListAddWeeklyOffServed, "holiday-list.create": holidayListCreateServed, "holiday-list.get": holidayListGetServed },
  refusals: { codes: Errors.codes, declared: Errors.declared, table: Errors.refusals },
});

// The MCP server's own runtime, built once per isolate: the same store, journal, busy count and auth as the API's.
let mcpRuntime: ManagedRuntime.ManagedRuntime<Services, never> | undefined;
const runtimeOf = (env: Env) =>
  (mcpRuntime ??= ManagedRuntime.make(
    Layer.mergeAll(StoreD1.layer({ tables, rules }), JournalD1.layer, BusyLive, Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))).pipe(Layer.provideMerge(Database.d1(env.DB))),
  ));

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

/** Who is asking at `/mcp`: any credential the identity knows, or an OAuth access token. This door is the agent's, so each is an agent for its person (M2-auth, fork 2). */
const asker = (env: Env, request: Request) =>
  runtimeOf(env).runPromise(Effect.flatMap(Principals, (principals) => principals.of(request.headers.get("authorization") ?? undefined, "mcp"))).then((principal) =>
    principal.kind !== "anonymous"
      ? { kind: "asked" as const, principal }
      : Effect.runPromise(AuthD1.oauth.bearer(routesOf(env), request)).then((who) => (who.kind === "person" ? { kind: "asked" as const, principal: who.principal } : who)));

/** `/mcp`: an agent's credential, or a 401 that says where to get one; then the tool call. */
const mcp = (env: Env, request: Request, context: Context.Context<never> | undefined): Promise<Response> =>
  asker(env, request).then((who) => {
    if (who.kind !== "asked") {
      const invalid = who.kind === "invalid";
      return Response.json({ error: invalid ? "invalid_token" : "unauthorized" }, { status: 401, headers: { "www-authenticate": AuthD1.oauth.challenge(request, invalid ? "invalid_token" : undefined) } });
    }
    // The caller's span, when it sent one, is the parent of every span of the call.
    const sent = request.headers.get("traceparent")?.match(TRACEPARENT);
    const parent = sent ? Tracer.externalSpan({ traceId: sent[1]!, spanId: sent[2]!, sampled: true }) : undefined;
    const run = (effect: Effect.Effect<McpResult, never, Services>) => {
      const traced = parent ? Effect.withParentSpan(effect, parent) : effect;
      return runtimeOf(env).runPromise(context ? Effect.provideContext(traced, context) : traced);
    };
    return Mcp.handle({ name: "capxul", version: env.ORTHO_REVISION ?? "0.0.0", tools, principal: who.principal, run }, request);
  });

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Closed before anything reads it: outside worlds there is no door to cast, to read facts, or to register a world.
    if (new URL(request.url).pathname.startsWith("/_world/") && !hostsWorlds(env)) return Promise.resolve(Response.json({ error: "not found" }, { status: 404 }));
    if (new URL(request.url).pathname.startsWith("/_world/")) {
      return toWorld({ worlds: env.WORLD, db: env.DB, tables: tables.map(([, table]) => table), leases: env.ORTHO_WORLDS === "1" }, request);
    }
    if (new URL(request.url).pathname === "/_ortho/bundle") {
      return env.ORTHO_REVISION && env.ORTHO_BUNDLE_SHA256
        ? Promise.resolve(Response.json({ revision: env.ORTHO_REVISION, sha256: env.ORTHO_BUNDLE_SHA256 }))
        : Promise.resolve(Response.json({ _tag: "NotAnEnvironment" }, { status: 404 }));
    }
    if (portal.owns(new URL(request.url).pathname)) return portal.serve(request, env);
    if (new URL(request.url).pathname.startsWith("/api/auth/")) return Effect.runPromise(AuthD1.handle(routesOf(env), request));
    if (new URL(request.url).pathname.startsWith("/.well-known/")) {
      return Effect.runPromise(AuthD1.oauth.discovery(routesOf(env), request)).then((found) => found ?? Response.json({ error: "not found" }, { status: 404 }));
    }
    if (new URL(request.url).pathname === "/mcp") {
      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "capxul", handler: (req, context) => mcp(env, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);
    }
    const app = (built ??= build(env));
    Telemetry.configure({ sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT });
    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "capxul", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);
  },
};
