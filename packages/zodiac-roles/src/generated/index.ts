// Generated from abi/. Do not edit.
import { Blueprint } from "orthograph";

export * as ModuleProxyFactory from "./ModuleProxyFactory.ts";
export * as Roles from "./Roles.ts";

export const calls = {
  ModuleProxyFactory: {
    deployModule: Blueprint.call({ mode: "effect" }),
  },
  Roles: {
    allowFunction: Blueprint.call({ mode: "effect" }),
    allowTarget: Blueprint.call({ mode: "effect" }),
    allowances: Blueprint.call({ mode: "effect" }),
    assignRoles: Blueprint.call({ mode: "effect" }),
    avatar: Blueprint.call({ mode: "effect" }),
    consumed: Blueprint.call({ mode: "effect" }),
    defaultRoles: Blueprint.call({ mode: "effect" }),
    disableModule: Blueprint.call({ mode: "effect" }),
    enableModule: Blueprint.call({ mode: "effect" }),
    execTransactionFromModule: Blueprint.call({ mode: "effect" }),
    execTransactionFromModuleReturnData: Blueprint.call({ mode: "effect" }),
    execTransactionWithRole: Blueprint.call({ mode: "effect" }),
    execTransactionWithRoleReturnData: Blueprint.call({ mode: "effect" }),
    getModulesPaginated: Blueprint.call({ mode: "effect" }),
    invalidate: Blueprint.call({ mode: "effect" }),
    isModuleEnabled: Blueprint.call({ mode: "effect" }),
    moduleTxHash: Blueprint.call({ mode: "effect" }),
    owner: Blueprint.call({ mode: "effect" }),
    renounceOwnership: Blueprint.call({ mode: "effect" }),
    revokeFunction: Blueprint.call({ mode: "effect" }),
    revokeTarget: Blueprint.call({ mode: "effect" }),
    scopeFunction: Blueprint.call({ mode: "effect" }),
    scopeTarget: Blueprint.call({ mode: "effect" }),
    setAllowance: Blueprint.call({ mode: "effect" }),
    setAvatar: Blueprint.call({ mode: "effect" }),
    setDefaultRole: Blueprint.call({ mode: "effect" }),
    setTarget: Blueprint.call({ mode: "effect" }),
    setTransactionUnwrapper: Blueprint.call({ mode: "effect" }),
    setUp: Blueprint.call({ mode: "effect" }),
    target: Blueprint.call({ mode: "effect" }),
    transferOwnership: Blueprint.call({ mode: "effect" }),
    unwrappers: Blueprint.call({ mode: "effect" }),
  },
};

export const standIn = { kind: "stand-in", how: "none" } as const;
