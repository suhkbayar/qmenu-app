import { gql } from '@apollo/client';

export const ADD_ORDER_LOYALTY = gql`
  mutation addOrderLoyalty($id: ID!, $input: AddOrderLoyaltyInput) {
    addOrderLoyalty(id: $id, input: $input) {
      id
      paymentState
    }
  }
`;
