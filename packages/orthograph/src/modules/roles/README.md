# roles

Owns `Blueprint.role`, `role.of(path)`, `anyone`, `signedIn` and `system`, the `.via` and `.notVia` that narrow an entry to the ways in it
keeps, and the `Principal` a call carries: one of five kinds (`anonymous`, `person`, `agent`, `service`, `system`), a person or agent with the
way it came in (`design/decisions/M2-auth.md`). The runtime checks the allowed roles before the handler runs; a role-of loads the thing the
payload field points at and runs the rule on it. `Blueprint.role(thing, { service: mount })` is a role for an outside service: it admits that
adapter's service and nobody else. Test: `roles.test.ts`.
