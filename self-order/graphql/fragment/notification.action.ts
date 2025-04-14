import { gql } from '@apollo/client';

export const NOTIFICATION_ACTION_FIELDS = gql`
  fragment NotificationActionFields on NotificationAction {
    name
    value
    type
    mutation
    variables
  }
`;
