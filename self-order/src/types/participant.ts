import { IBranch } from './branch';
import { IChannelConfig } from './channel.config';
import { IMenu } from './menu';
import { IPayment } from './payment';
import { ITable } from './table';

export interface IParticipant {
  advancePayment: boolean;
  branch: IBranch;
  id: string;
  channel: string;
  menu: IMenu;
  waiter: boolean;
  orderable: boolean;
  payments: IPayment[];
  table: ITable;
  services: string[];
  vat: boolean;
  configs?: IChannelConfig[];
}
