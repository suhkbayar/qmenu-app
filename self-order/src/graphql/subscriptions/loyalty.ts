import { gql } from '@apollo/client';

export const ON_UPDATED_LOYALTY_RECORD = gql`
  subscription onUpdatedLoyaltyRecord($customer: ID!) {
    onUpdatedLoyaltyRecord(customer: $customer) {
      amount
      id
      memberId
      state
      progress
      type
    }
  }
`;
