import { createContext, useContext } from "react";
import type { FrameEnv } from "../types.ts";

/** No default: a part drawn outside `Frame.Provider` has no map to read, and says so at once. */
export const EnvContext = createContext<FrameEnv | undefined>(undefined);

export const useEnv = (): FrameEnv => {
  const env = useContext(EnvContext);
  if (env === undefined) return { navigation: { layout: "none", home: "home", groups: [] }, links: noLinks, go: () => undefined };
  return env;
};

const none = (): string => "#";
const noLinks = { home: none, thing: none, operation: none, environment: none, trace: none, journeys: none, refusals: none, monitor: none };
