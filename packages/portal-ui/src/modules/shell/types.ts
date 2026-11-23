// The shell module: what `Shell` holds (F7 decision 2). Its parts are HeroUI Pro's `AppLayout`, `Sidebar` and `Navbar` under our names.
export const shellParts = ["Layout", "Tree", "TopBar", "Rail", "Drawer"] as const;
export type ShellPart = (typeof shellParts)[number];
