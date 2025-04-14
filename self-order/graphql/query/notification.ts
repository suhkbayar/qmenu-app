import { gql } from '@apollo/client';
import { NOTIFICATION_ACTION_FIELDS, NOTIFICATION_FIELDS } from '../fragment';

export const GET_NOTIFICATIONS = gql`
  query getNotifications($limit: Int!, $nextToken: String) {
    getNotifications(limit: $limit, nextToken: $nextToken) {
      notifications {
        ...NotificationFields
        actions {
          ...NotificationActionFields
        }
      }
      nextToken
    }
  }
  ${NOTIFICATION_ACTION_FIELDS}
  ${NOTIFICATION_FIELDS}
`;
