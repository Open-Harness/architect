import { join } from "node:path";

export const SUFFIX = ".json";

/** The file of a label: the label as a URI component, so no label can climb out of the folder. */
export const fileOf = (directory: string, label: string) => join(directory, `${encodeURIComponent(label)}${SUFFIX}`);

/** The label a file name is of. */
export const labelOf = (name: string) => decodeURIComponent(name.slice(0, -SUFFIX.length));
