// The only file of the shell module that names HeroUI Pro. Each export is Pro's own component under our name (F7), so the
// build can emit declarations without reading Pro (`isolatedDeclarations`). Pro's parts are imported from their own subpaths.
export { AppLayout as Layout, AppLayoutAsideTrigger as Rail, AppLayoutMobileAside as Drawer } from "@heroui-pro/react/app-layout";
export { Navbar as TopBar } from "@heroui-pro/react/navbar";
export { Sidebar as Tree } from "@heroui-pro/react/sidebar";
