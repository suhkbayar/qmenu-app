export interface IOrderItemData {
  giftToTableName?: string;
}

export const parseOrderItemData = (data?: string | null): IOrderItemData => {
  if (!data) return {};

  try {
    return JSON.parse(data) ?? {};
  } catch {
    return {};
  }
};
