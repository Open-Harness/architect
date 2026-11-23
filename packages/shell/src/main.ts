// The shell's entry and composition root: the one place that touches the window. `mountShell` makes the agent bridge once, follows the real
// address bar, and mounts the frame; everything under it is given what it needs.
import { createAgent } from "@ui-sdk/react/agent";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Frame } from "./modules/frame/service.ts";
import type { ShellProps } from "./modules/frame/types.ts";
import { History } from "./modules/history/service.ts";
import { Styles } from "./modules/styles/service.ts";

/** What UI SDK's `createAgent` takes: `allow` decides whether a step an agent asks for may run (the shell's own steps need no yes). */
export type AgentOptions = NonNullable<Parameters<typeof createAgent>[0]>;

export type MountProps = ShellProps & { readonly agent?: AgentOptions };

export interface Mounted {
  /** The UI SDK bridge, made once for this mount: `snapshot()`, `act()` and `query()` read and drive the navigation and the palette by name. */
  readonly agent: ReturnType<typeof createAgent>;
  /** Take the shell down: its React tree, and its listeners. The page it leaves is left in the DOM as the app wrote it. */
  readonly unmount: () => void;
  /** The router's own push: the same move a link makes. */
  readonly navigate: (to: string) => void;
}

export const mountShell = (root: HTMLElement, props: MountProps): Mounted => {
  const agent = createAgent(props.agent);
  const history = History.browser(window);
  Styles.install(root.ownerDocument);
  const react = createRoot(root);
  react.render(createElement(Frame.Shell, { props, history }));
  return { agent, unmount: () => { react.unmount(); }, navigate: history.push };
};
