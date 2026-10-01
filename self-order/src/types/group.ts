import { BaseEntity } from './base';
import { IMember } from './members';

export interface IGroup extends BaseEntity {
  createdAt: string;
  updatedAt: string;
  members: IMember[];
}
