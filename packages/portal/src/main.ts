// The portal's client entry: what `vite build` bundles into `dist/client` (K19). It mounts the pages on the path the browser opened, and
// reads nothing but `/_portal/v1/*`. It is never imported by the server half, and never reaches a Worker.
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Pages } from "#modules/pages/service.js";
import "./portal.css";

const root = document.getElementById("root");
if (root !== null) createRoot(root).render(createElement(Pages.App, { pathname: location.pathname, search: location.search }));
