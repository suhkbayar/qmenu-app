import { gql } from '@apollo/client';
import { ORDER_ITEM_OPTION_FIELDS, TABLE_FIELDS, TRANSACTION_FIELDS } from '../fragments';

export const ORDER_FIELDS = gql`
  fragment OrderFields on Order {
    id
    type
    date
    number
    state
    branchId
    customerId
    isRead
    paymentState
    address
    floor
    channelType
    contact
    guests
    comment
    gifts {
      id
      fromTableId
      fromTableName
      toTableId
      stickerId
      itemIds
      anonymous
      respondedAt
    }
    table {
      id
      name
    }
    name
    deliveryDate
    totalAmount
    discountAmount
    taxAmount
    grandTotal
    paidAmount
    debtAmount
    createdAt
    updatedAt
    register
    buyer
    vatState
    vatType
    vatAmount
    cityTax
    vatBillId
    vatIncludeAmount
    vatExcludeAmount
    vatDate
    vatLottery
    vatData
    orderedAt
    acceptedAt
    preparingAt
    preparedAt
    deliveringAt
    deliveredAt
    completedAt
    cancelledAt
    returnedAt
    movedAt
    printed
    printable
    deliveryCode
    startAt
    duration
  }
`;
export const ORDER_ITEM_FIELDS = gql`
  fragment OrderItemFields on OrderItem {
    id
    state
    quantity
    comment
    reason
    total
    name
    price
    type
    discount
    createdAt
    updatedAt
    completedAt
    image
    productId
    variantName
    data
    options {
      ...OrderItemOptionFields
    }
  }
  ${ORDER_ITEM_OPTION_FIELDS}
`;

export const STAFF_FIELDS = gql`
  fragment StaffFields on Staff {
    id
    name
    firstName
    lastName
    phone
    email
    username
    state
    code
    passwordChangedAt
  }
`;

export const ORDER_LOYALTY_FIELDS = gql`
  fragment OrderLoyaltyFields on OrderLoyalty {
    id
    type
    date
    code
    point
    data
    data1
    state
  }
`;

export const DISCOUNTS_FIELDS = gql`
  fragment DiscountsFields on OrderDiscount {
    amount
    calculation
    createdAt
    discountId
    state
    id
    name
    type
    updatedAt
    value
  }
`;

export const CHARGES_FIELDS = gql`
  fragment ChargesFields on OrderCharge {
    calculation
    amount
    createdAt
    id
    state
    name
    chargeId
    type
    value
    updatedAt
  }
`;

export const GET_ORDER = gql`
  query getOrder($id: ID!) {
    getOrder(id: $id) {
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

export const GET_TABLET_ORDERS = gql`
  query getTabletOrders($limit: Int) {
    getTabletOrders(limit: $limit) {
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
