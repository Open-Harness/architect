#!/usr/bin/env node
// Generated from the blueprint. Do not edit.
// `capxul <thing> <verb> --<field> <value>`. Talks to CAPXUL_URL, signed in with CAPXUL_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { create as companyCreate } from "./company/create.ts";
import { get as companyGet } from "./company/get.ts";
import { create as departmentCreate } from "./department/create.ts";
import { get as departmentGet } from "./department/get.ts";
import { create as designationCreate } from "./designation/create.ts";
import { get as designationGet } from "./designation/get.ts";
import { get as employeeGet } from "./employee/get.ts";
import { hire as employeeHire } from "./employee/hire.ts";
import { relieve as employeeRelieve } from "./employee/relieve.ts";

// The release version is stamped in when the CLI is published (`ortho publish`); run from source, it says 0.0.0.
declare const ORTHO_VERSION: string | undefined;

const company = Command.make("company").pipe(Command.withSubcommands([companyCreate, companyGet]));
const department = Command.make("department").pipe(Command.withSubcommands([departmentCreate, departmentGet]));
const designation = Command.make("designation").pipe(Command.withSubcommands([designationCreate, designationGet]));
const employee = Command.make("employee").pipe(Command.withSubcommands([employeeGet, employeeHire, employeeRelieve]));

Command.make("capxul").pipe(
  Command.withSubcommands([company, department, designation, employee]),
  Command.run({ version: typeof ORTHO_VERSION === "string" ? ORTHO_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["CAPXUL_URL"] ?? "http://127.0.0.1:8787", process.env["CAPXUL_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
