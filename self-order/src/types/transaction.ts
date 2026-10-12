import { IPayment } from './payment';

export interface ITransaction {
  id?: string;
  type: string;
  token: string;
  amount: number;
  currency: string;
  state: string;
  entry: string;
  description: string;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  links: ITransactionLink[];
  payment: IPayment;
  image: string;
  code: string;
  data: string;
}

export interface ITransactionLink {
  name: string;
  description: string;
  log: string;
  link: string;
}
