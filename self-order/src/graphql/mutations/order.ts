import { gql } from '@apollo/client';
import { TABLE_FIELDS, TRANSACTION_FIELDS } from '../fragments';
import {
  CHARGES_FIELDS,
  DISCOUNTS_FIELDS,
  ORDER_FIELDS,
  ORDER_ITEM_FIELDS,
  ORDER_LOYALTY_FIELDS,
} from '../queries';

export const CREATE_ORDER = gql`
  mutation createOrder($id: ID, $input: OrderInput!, $participant: ID!) {
    createOrder(id: $id, input: $input, participant: $participant) {
      branch {
        id
        logo
        type
        name
      }
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
    }
  }
  ${TABLE_FIELDS}
  ${ORDER_FIELDS}
  ${DISCOUNTS_FIELDS}
  ${CHARGES_FIELDS}
  ${ORDER_ITEM_FIELDS}
  ${TRANSACTION_FIELDS}
  ${ORDER_LOYALTY_FIELDS}
`;

/** A new round of items onto the table's open order; the kitchen gets just the new items. */
export const ADD_ORDER_ITEMS = gql`
  mutation addOrderItems($participant: ID!, $id: ID!, $items: [OrderItemInput!]!) {
    addOrderItems(participant: $participant, id: $id, items: $items) {
      ...OrderFields
      items {
        ...OrderItemFields
      }
    }
  }
  ${ORDER_FIELDS}
  ${ORDER_ITEM_FIELDS}
`;

export const GET_PAY_ORDER = gql`
  mutation payOrder($input: TransactionInput!) {
    payOrder(input: $input) {
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
        loyalties {
          ...OrderLoyaltyFields
        }
      }
      transaction {
        ...TransactionFields
      }
    }
  }
  ${ORDER_FIELDS}
  ${TABLE_FIELDS}
  ${ORDER_ITEM_FIELDS}
  ${ORDER_LOYALTY_FIELDS}
  ${TRANSACTION_FIELDS}
`;

export const VALIDATE_TRANSACTION = gql`
  mutation validateTransaction($id: ID!, $isInvoice: Boolean, $data: String) {
    validateTransaction(id: $id, isInvoice: $isInvoice, data: $data) {
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
      loyalties {
        ...OrderLoyaltyFields
      }
    }
  }
  ${ORDER_FIELDS}
  ${TABLE_FIELDS}
  ${ORDER_ITEM_FIELDS}
  ${TRANSACTION_FIELDS}
  ${ORDER_LOYALTY_FIELDS}
`;
