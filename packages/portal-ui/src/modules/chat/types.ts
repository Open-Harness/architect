// The chat module: what `Chat` holds (F7 decision 2). `Tool` takes the states `input-streaming`, `input-available`,
// `output-available`, `output-error` and `requires-action`, which are Pro's own.
export const chatParts = [
  "Conversation",
  "Message",
  "MessageActions",
  "Tool",
  "Input",
  "Suggestions",
  "List",
  "Thinking",
  "Loader",
  "Shimmer",
  "Source",
  "Attachment",
] as const;
export type ChatPart = (typeof chatParts)[number];
