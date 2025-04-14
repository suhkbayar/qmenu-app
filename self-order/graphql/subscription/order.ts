import { gql } from '@apollo/client';
import { TABLE_FIELDS, TRANSACTION_FIELDS } from '../fragment';
import {
  CHARGES_FIELDS,
  DISCOUNTS_FIELDS,
  ORDER_FIELDS,
  ORDER_ITEM_FIELDS,
  ORDER_LOYALTY_FIELDS,
  STAFF_FIELDS,
} from '../query';

export const ON_UPDATED_ORDER = gql`
  subscription onUpdatedOrder($customer: ID!) {
    onUpdatedOrder(customer: $customer) {
      branch
      customer
      event
      id
      order {
        ...OrderFields
        table {
          ...TableFields
        }
        items {
          ...OrderItemFields
        }
        transactions {
          ...TransactionFields
        }
        discounts {
          ...DiscountsFields
        }
        charges {
          ...ChargesFields
        }
        loyalties {
          ...OrderLoyaltyFields
        }
        staff {
          ...StaffFields
        }
      }
    }
  }
  ${TABLE_FIELDS}
  ${ORDER_FIELDS}
  ${DISCOUNTS_FIELDS}
  ${CHARGES_FIELDS}
  ${ORDER_ITEM_FIELDS}
  ${TRANSACTION_FIELDS}
  ${ORDER_LOYALTY_FIELDS}
  ${STAFF_FIELDS}
`;
