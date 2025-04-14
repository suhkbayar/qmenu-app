import { gql } from '@apollo/client';
import { NOTIFICATION_ACTION_FIELDS } from './notification.action';

export const NOTIFICATION_FIELDS = gql`
  fragment NotificationFields on Notification {
    pk
    sk
    title
    type
    data
    isRead
    actions {
      ...NotificationActionFields
    }
  }
  ${NOTIFICATION_ACTION_FIELDS}
`;
