// Generated from blueprint/projections/api.ts. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as handleClaim from "./handle/claim.ts";
import * as handleRelease from "./handle/release.ts";
import * as handleResolve from "./handle/resolve.ts";
import * as linkAdd from "./link/add.ts";
import * as linkOrder from "./link/order.ts";
import * as linkRemove from "./link/remove.ts";
import * as profileGet from "./profile/get.ts";

export class Handle extends HttpApiGroup.make("handle").add(handleClaim.endpoint).add(handleRelease.endpoint).add(handleResolve.endpoint) {}
export class Link extends HttpApiGroup.make("link").add(linkAdd.endpoint).add(linkOrder.endpoint).add(linkRemove.endpoint) {}
export class Profile extends HttpApiGroup.make("profile").add(profileGet.endpoint) {}
export class Api extends HttpApi.make("plugged-in").add(Handle).add(Link).add(Profile) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "handle.claim": handleClaim, "handle.release": handleRelease, "handle.resolve": handleResolve, "link.add": linkAdd, "link.order": linkOrder, "link.remove": linkRemove, "profile.get": profileGet } as const;
