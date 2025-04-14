import { NotificationActionType, NotificationType } from '../constants/constant';

export interface INotification {
  pk: string;
  sk: string;
  title: string;
  type: NotificationType;
  data: any;
  isRead: boolean;
  actions: INotificationAction[];
}

export interface INotificationAction {
  name: string;
  value: string;
  type: NotificationActionType;
  mutation: string;
  variables: string;
}
