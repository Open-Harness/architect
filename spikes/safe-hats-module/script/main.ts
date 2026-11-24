import { proveBudgets } from "./budgets.ts"
import { withAnvil } from "./chain.ts"
import { proveGoal4 } from "./goal4.ts"
import { proveHats } from "./hats.ts"
import { proveSafeSignatures } from "./safe-signatures.ts"

await withAnvil(async (chain) => {
  const world = await proveGoal4(chain)
  console.log("HATS")
  const hats = await proveHats(chain, world)
  console.log("SAFE SIGNATURES")
  await proveSafeSignatures(chain, world, hats.safe)
  console.log("BUDGETS")
  await proveBudgets(chain, world, hats)
})
