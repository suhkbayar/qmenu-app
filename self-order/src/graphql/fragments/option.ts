import { gql } from '@apollo/client';

export const ORDER_ITEM_OPTION_FIELDS = gql`
  fragment OrderItemOptionFields on OrderItemOption {
    id
    value
    price
    name
  }
`;
