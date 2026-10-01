import { BaseEntity } from './base';

export interface IPayment extends BaseEntity {
  type: string;
  active: boolean;
}
