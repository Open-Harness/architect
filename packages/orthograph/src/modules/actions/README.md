# actions

Owns `orthograph/actions`: the port from agent-native's `defineAction` (M1.23, K9, K29 section 3.1). Generated code gives each
operation an `options(host)` in agent-native's field names; a host calls `defineAction(options, approver)` to wrap it.

- `defineAction`: approval waits here, never in `run`. An action that `needsApproval` asks the approver once per call unless the
  host already holds a yes (`approvedToolCallKey`); a no is the refusal `AR-007`. Whatever `run` rejects with that is not an
  `ActionRefusal` becomes a plain `Error` with a fixed message and nothing of the original.
- `ActionRefusal`: a real `Error` with the members agent-native reads by duck typing (`actionContractError`, `noWrite`,
  `errorCode`, `statusCode: 422`, `details`).
- `runForAction`: runs an SDK call's Effect for a host. A declared refusal becomes an `ActionRefusal`; every other failure,
  defect or interruption a redacted plain `Error`. An aborted `signal` interrupts the call.
- `Actions.registry`: lists each action once, in order, with its flags and a JSON input schema (Effect's Standard Schema and
  Standard JSON Schema adapters); refuses two actions of one name.

The Promise edge (`run`, `runForAction`, the approver) is `internal/edge.ts`, which converts with Effect's own runners; there is
no `async`, `await`, `try` or `throw` in the module. Entry: `src/actions.ts`. Test: `actions.test.ts`.
