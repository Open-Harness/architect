# deployment

`SafeDeployment` is Safe 1.4.1 as Capxul deploys it (CX-safe, unit A3, #1161): the SafeL2 singleton, `SafeProxyFactory`,
`MultiSend` and `MultiSendCallOnly`, and Safe's 4337 module release v0.3.0 (`SafeModuleSetup`, `Safe4337Module`, bound to
EntryPoint v0.7). Addresses and code hashes come from `@safe-global/safe-deployments` and
`@safe-global/safe-modules-deployments` at an exact version; the proxy creation code from the 1.4.1 release's `SafeProxy`.

Status: a placeholder until the build lands; `deployment.test.ts` is the check, listed in `expected-failing/`.
