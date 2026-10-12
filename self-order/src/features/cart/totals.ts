import { IOrderItem } from '@/src/types';

type Line = Pick<IOrderItem, 'price' | 'quantity' | 'options'>;

/** One cart line: (item price + chosen options) × quantity. */
export const lineTotal = (line: Line): number => {
  const options = (line.options ?? []).reduce((sum: number, option) => sum + (option.price || 0), 0);
  return (line.price + options) * line.quantity;
};

/** Item count and amount for the whole cart. The only place cart money is added up. */
export const cartTotals = (lines: Line[]) => ({
  quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
  amount: lines.reduce((sum, line) => sum + lineTotal(line), 0),
});
