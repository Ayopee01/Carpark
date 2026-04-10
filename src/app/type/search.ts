export type KeyboardKeyItem = {
  type: "key";
  value: string;
};

export type KeyboardDeleteItem = {
  type: "delete";
};

export type KeyboardConfirmItem = {
  type: "confirm";
  label: string;
};

export type KeyboardItem =
  | KeyboardKeyItem
  | KeyboardDeleteItem
  | KeyboardConfirmItem;

export type PlateDetail = {
  plate: string;
  province: string;
  date: string;
  entryTime: string;
  duration: string;
  paymentStatus: string;
  amount: number;
  paymentMethod: string;
};

export type PlateSearchSuccessResponse = {
  ok: true;
  message: string;
  data: PlateDetail;
};

export type PlateSearchNotFoundResponse = {
  ok: false;
  message: string;
  data: null;
};

export type PlateSearchResponse =
  | PlateSearchSuccessResponse
  | PlateSearchNotFoundResponse;