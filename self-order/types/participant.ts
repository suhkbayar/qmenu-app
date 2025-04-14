import { IBranch } from './branch';
import { IChannelConfig } from './channel.config';
import { IMenu } from './menu';
import { IPayment } from './payment';

export interface IParticipant {
  advancePayment: boolean;
  branch: IBranch;
  id: string;
  channel: string;
  menu: IMenu;
  waiter: boolean;
  orderable: boolean;
  payments: IPayment[];
  services: string[];
  vat: boolean;
  configs?: IChannelConfig[];
}
