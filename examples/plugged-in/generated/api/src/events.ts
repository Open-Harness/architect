// Generated from blueprint/projections/api.ts. Do not edit.
import { EventNames } from "orthograph/server";
import * as Handle from "../../../blueprint/things/handle/events.ts";
import * as Link from "../../../blueprint/things/link/events.ts";

EventNames.name(Handle.HandleClaimed, "HandleClaimed");
EventNames.name(Handle.HandleReleased, "HandleReleased");
EventNames.name(Link.LinkAdded, "LinkAdded");
EventNames.name(Link.LinkRemoved, "LinkRemoved");

export const names = ["HandleClaimed", "HandleReleased", "LinkAdded", "LinkRemoved"] as const;
