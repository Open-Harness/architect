import { Blueprint } from "orthograph";
import { Locker } from "./thing.ts";

export const LockerInstalled = Blueprint.event({ locker: Locker.fields.id, label: Locker.fields.label });
// The journal keeps public fields only, so the event may name all three.
export const LockerOpened = Blueprint.event({ locker: Locker.fields.id, label: Locker.fields.label, note: Locker.fields.note, code: Locker.fields.code });
