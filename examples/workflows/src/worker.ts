// The Worker the journeys in e2e/workflows run (M3-workflows section 6: until the compiler knows workflows, this entry
// file registers them and exports the run's Durable Object by hand). Blank until M3.28. What it must export and serve is
// `e2e/workflows/README.md`, "The Worker's contract"; `e2e/workflows/contract.ts` says it in types.
export default {
  fetch: (): Response => new Response("examples/workflows: the Worker is not built yet (M3.28)", { status: 501 }),
};
