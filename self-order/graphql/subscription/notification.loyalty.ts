import { gql } from '@apollo/client';
import { NOTIFICATION_FIELDS } from '../fragment';

export const ON_UPDATED_CUSTOMER_NOTIFICATION = gql`
  subscription onUpdatedCustomerNotification($customer: ID!) {
    onUpdatedCustomerNotification(customer: $customer) {
      customer
      notification {
        ...NotificationFields
      }
    }
  }
  ${NOTIFICATION_FIELDS}
`;
