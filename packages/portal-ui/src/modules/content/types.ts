// The content module: the names it exports (F7 decision 2).
export const contentNames = ["Card", "CardGroup", "Code", "Command", "Editor", "Markdown", "Peek"] as const;
export type ContentName = (typeof contentNames)[number];
