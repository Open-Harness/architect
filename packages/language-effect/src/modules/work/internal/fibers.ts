// The runtime tells us when a fiber starts and ends (`Metric.FiberRuntimeMetrics`), so every fiber a request forks is counted while it runs. Which
// fiber is running is only known where our own code runs (a sleep lending its token, a combinator joining), by its id (M8.07).
import { Fiber } from "effect";

/** The id of the fiber that is running, if any. */
export const runningId = (): number | undefined => Fiber.getCurrent()?.id;
