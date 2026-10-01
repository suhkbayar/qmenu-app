import { CustomerAccountType } from '../constants/constant';

export interface IUpointBalance {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  type: CustomerAccountType;
  data: string;
  verified: boolean;
  code: string;
  accountId: string;
  balance: number;
}
