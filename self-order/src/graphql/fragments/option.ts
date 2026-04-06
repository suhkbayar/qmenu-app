import { gql } from '@apollo/client';

export const OPTION_FIELDS = gql`
  fragment OptionFields on Option {
    createdAt
    id
    name
    type
    updatedAt
    values
    productId
  }
`;

export const ORDER_ITEM_OPTION_FIELDS = gql`
  fragment OrderItemOptionFields on OrderItemOption {
    id
    value
    price
    name
  }
`;
