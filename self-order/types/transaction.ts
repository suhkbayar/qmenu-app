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
}

export interface ITransactionLink {
  name: string;
  description: string;
  log: string;
  link: string;
}

export interface TransactionInput {
  order: string;
  confirm: boolean;
  payment: string;
  amount: number;
  vatType: number;
  register: string;
  buyer: string;
  code: string;
}
