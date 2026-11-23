// @orthograph/shell: the app's frame (K31). `mountShell` draws it over the generated app data; the types are the contract of its props.
export { mountShell } from "./main.ts";
export type { AgentOptions, Mounted, MountProps } from "./main.ts";
export type { FrameProps, MapData, PageFn, ShellProps, SlotFn, SlotName, Slots } from "./modules/frame/types.ts";
export type { Layout, NavGroup, NavigationData, NavItem } from "./modules/navigation/types.ts";
export type { Allowed, Caller, OperationEntry, PageEntry, PaletteEntry } from "./modules/palette/types.ts";
export type { Match, Params, RouteRow, RouteTable } from "./modules/router/types.ts";
