export type KeyboardItem =
  | { type: "key"; value: string }
  | { type: "delete" }
  | { type: "confirm" };
