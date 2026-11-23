# shell

`Shell` is the portal's frame (F7): `Layout`, `Tree`, `TopBar`, `Rail` and `Drawer`, each HeroUI Pro's component under our name
(`AppLayout`, `Sidebar`, `Navbar`, `AppLayoutAsideTrigger`, `AppLayoutMobileAside`). `internal/parts.ts` is the only file that
names Pro. The tree, the top bar with its environment and window, the live rail and the drawer are composed from these in M1.24.

Tests: `shell.test.ts` reads the sources (Pro is not needed to run it); the declared parts and the exported ones must agree.
