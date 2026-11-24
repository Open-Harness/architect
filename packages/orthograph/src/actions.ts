// orthograph/actions: `defineAction` and what a host needs to serve generated actions (M1.23, K29 section 3.1).
import { Actions as Module } from "#modules/actions/service.js";

export { ActionRefusal } from "#modules/actions/service.js";
export const { defineAction, runForAction } = Module;
export const Actions = Object.freeze({ registry: Module.registry });
export type * from "#modules/actions/types.js";
