import { BaseEntity } from './base';
import { IGroup } from './group';

export interface IMember extends BaseEntity {
  comment: string;
  covers: number;
  createdAt: string;
  gender: string;
  email: string;
  guest: boolean;
  overallRating: any;
  phone: string;
  spendPerVisit: number;
  spendPerCover: number;
  totalReviews: number;
  totalSpend: number;
  updatedAt: string;
  visitedAt: string;
  visits: number;
  groups: IGroup;
}
