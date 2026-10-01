import { BaseEntity } from './base';
import { IGroup } from './group';

export interface ICustomer extends BaseEntity {
  phone: string;
  email: string;
  lastName: string;
  comment: string;
  gender: string;
  birthday: string;
  covers: string;
  createdAt: string;
  visitedAt: string;
  visits: number;
  spendPerCover: number;
  spendPerVisit: number;
  totalSpend: number;
  groups: IGroup[];
  firstName?: string;
}
