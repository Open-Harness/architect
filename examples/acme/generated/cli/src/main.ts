#!/usr/bin/env node
// Generated from blueprint/projections/cli.ts. Do not edit.
// `acme <thing> <verb> --<field> <value>`. Talks to ACME_URL, signed in with ACME_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { get as allowanceGet } from "./allowance/get.ts";
import { grant as allowanceGrant } from "./allowance/grant.ts";
import { revoke as allowanceRevoke } from "./allowance/revoke.ts";
import { spend as allowanceSpend } from "./allowance/spend.ts";
import { create as apiKeyCreate } from "./api-key/create.ts";
import { accept as invitationAccept } from "./invitation/accept.ts";
import { revoke as invitationRevoke } from "./invitation/revoke.ts";
import { send as invitationSend } from "./invitation/send.ts";
import { get as membershipGet } from "./membership/get.ts";
import { create as organizationCreate } from "./organization/create.ts";
import { get as organizationGet } from "./organization/get.ts";
import { signUp as personSignUp } from "./person/sign-up.ts";
import { show as sessionShow } from "./session/show.ts";
import { signIn as sessionSignIn } from "./session/sign-in.ts";
import { health as systemHealth } from "./system/health.ts";

// The release version is stamped in when the CLI is published (`ortho publish`); run from source, it says 0.0.0.
declare const ORTHO_VERSION: string | undefined;

const allowance = Command.make("allowance").pipe(Command.withSubcommands([allowanceGet, allowanceGrant, allowanceRevoke, allowanceSpend]));
const apiKey = Command.make("api-key").pipe(Command.withSubcommands([apiKeyCreate]));
const invitation = Command.make("invitation").pipe(Command.withSubcommands([invitationAccept, invitationRevoke, invitationSend]));
const membership = Command.make("membership").pipe(Command.withSubcommands([membershipGet]));
const organization = Command.make("organization").pipe(Command.withSubcommands([organizationCreate, organizationGet]));
const person = Command.make("person").pipe(Command.withSubcommands([personSignUp]));
const session = Command.make("session").pipe(Command.withSubcommands([sessionShow, sessionSignIn]));
const system = Command.make("system").pipe(Command.withSubcommands([systemHealth]));

Command.make("acme").pipe(
  Command.withSubcommands([allowance, apiKey, invitation, membership, organization, person, session, system]),
  Command.run({ version: typeof ORTHO_VERSION === "string" ? ORTHO_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["ACME_URL"] ?? "http://127.0.0.1:8787", process.env["ACME_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
