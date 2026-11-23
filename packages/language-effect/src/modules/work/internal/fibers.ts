// The runtime tells us when a fiber starts and ends (`Metric.FiberRuntimeMetrics`): at a start the fiber that is running is the one forking
// (`Fiber.getCurrent()`); at an end no fiber is current, only the ending fiber's context is given. Who forked whom is what tells a fiber that works
// from one that only waits for its children, and the fibers `Effect.all` and `race` start belong to no parent in Effect's own records (M8.07).
import { Fiber } from "effect";

/** The fiber that is running, if any: the one that forks, when the runtime announces a start. */
export const currentFiber = (): Fiber.Fiber<unknown, unknown> | undefined => Fiber.getCurrent();
export const runningId = (): number | undefined => Fiber.getCurrent()?.id;

/** Has the fiber ended? */
export const ended = (fiber: Fiber.Fiber<unknown, unknown>): boolean => fiber.pollUnsafe() !== undefined;
