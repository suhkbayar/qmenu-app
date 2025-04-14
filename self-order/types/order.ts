import { ITransaction } from './transaction';

export interface IOrder {
  id?: string;
  number: string;
  date: string;
  type: string;
  contact: string;
  comment: string;
  deliveryDate: Date;
  customerId: string;
  address: string;
  isRead: boolean;
  name: string;
  channelType: string;
  memberId: string;
  items: IOrderItem[];
  charges: IOrderCharge[];
  transactions: ITransaction[];
  totalAmount: number;
  discountAmount: number;
  discounts: IOrderDiscount[];
  taxAmount: number;
  paidAmount: number;
  debtAmount: number;
  guests: number;
  grandTotal: number;
  state: string;
  paymentState: string;
  createdAt: Date;
  updatedAt: Date;
  register: string;
  buyer: string;
  vatState: string;
  vatType: number;
  vatAmount: number;
  cityTax: number;
  vatBillId: string;
  vatDate: string;
  vatLottery: string;
  vatCode: string;
  vatData: string;
  phone?: string;
  acceptedAt: string;
  preparedAt: string;
  vatIncludeAmount: number;
  vatExcludeAmount: number;
  startAt: string;
  duration?: number;
  vats?: IVats[];
}

export interface ICustomerOrder {
  items: IOrderItem[];
  totalAmount: number;
  grandTotal: number;
  totalQuantity: number;
  state: string;
}

export interface IVats {
  amount: number;
  buyer: string;
  citytax: any;
  createdAt: string;
  date: string;
  id: string;
  register: any;
  state: any;
  type: any;
  updatedAt: string;
}

export interface IOrderCharge {
  id?: number;
  type: any;
  name: string;
  chargeId: string;
  calculation: any;
  state: any;
  amount: any;
  value: number;
}

export interface IOrderDiscount {
  id?: number;
  type: any;
  name: string;
  calculation: any;
  amount?: any;
  state: any;
  discountId: string;
  value: number;
}

export interface IOrderItemOptions {
  id: string;
  name: string;
  price: number;
  value: any;
  type: string;
}

export interface IOrderItem {
  id?: string;
  uuid: string;
  name: string;
  quantity: number;
  comment?: string;
  price: number;
  discount: number;
  state: string;
  image: string;
  reason: string;
  productId?: string;
  // variant: IVariant;
  variantName?: string;
  options: IOrderItemOptions[];
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
}
