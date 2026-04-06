import { IOrder } from './order';
import { ICustomer } from './customer';

export interface IOrderReview {
  id: string;
  createdAt: string;
  updatedAt: string;
  order: IOrder;
  customer: ICustomer;
  type: string;
  liked: number;
  comment: string;
  additional: string;
  pictures: string;
  uploads: string;
}
