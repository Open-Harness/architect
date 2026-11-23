import type { StylesApi } from "./types.ts";
import { frame } from "./internal/frame.ts";
import { navigation } from "./internal/navigation.ts";
import { palette } from "./internal/palette.ts";

const css = [frame, navigation, palette].join("\n");
const ID = "orthograph-shell-styles";

export const Styles: StylesApi = {
  css,
  install: (doc) => {
    if (doc.getElementById(ID) !== null) return;
    const style = doc.createElement("style");
    style.id = ID;
    style.textContent = css;
    doc.head.append(style);
  },
};
