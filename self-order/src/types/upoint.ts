/** A U-Point account found by its card number or phone and PIN (getBalanceUpoint). */
export interface IUpointBalance {
  id: string;
  phone: string;
  /** The card number */
  code: string;
  balance: number;
  /** The guest's own coupons that fit this order; none when signed in by phone */
  coupons?: IUpointCoupon[] | null;
}

/** A U-Point coupon checked against the order (not used yet): what it takes off, and until when. */
export interface IUpointCoupon {
  code: string;
  amount: number;
  /** The product it's for, when it's for one product; none for an amount voucher */
  name?: string | null;
  expireDate?: string | null;
  /** The owner's phone it's used with: the signed-in guest's, or a friend's typed with the code */
  phone?: string;
}
