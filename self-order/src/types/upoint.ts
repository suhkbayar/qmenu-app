/** A U-Point account found by its card number or phone and PIN (getBalanceUpoint). */
export interface IUpointBalance {
  id: string;
  phone: string;
  /** The card number */
  code: string;
  balance: number;
}
