import { gql } from '@apollo/client';
import { LOYALTY_FIELDS } from '../fragment';

export const GET_LOYALTIES = gql`
  query getLoyalties {
    getLoyalties {
      ...LoyaltyFields
    }
  }
  ${LOYALTY_FIELDS}
`;

export const GET_BALANCE_UPOINT = gql`
  query getBalanceUpoint($input: BalanceInput!) {
    getBalanceUpoint(input: $input) {
      id
      customerId
      firstName
      lastName
      phone
      verified
      type
      data
      verified
      code
      balance
    }
  }
`;

export const GET_LOYALTIES_RECORDS = gql`
  query getLoyaltyRecords {
    getLoyaltyRecords {
      id
      memberId
      amount
      type
      progress
      loyalty {
        ...LoyaltyFields
        configs {
          id
          name
          value
        }
      }
    }
  }
  ${LOYALTY_FIELDS}
`;

export const GET_LOYALTIES_RECORD = gql`
  query getLoyaltyRecord($loyaltyId: ID!) {
    getLoyaltyRecord(loyaltyId: $loyaltyId) {
      id
      memberId
      amount
      type
      progress
      loyalty {
        ...LoyaltyFields
        configs {
          id
          name
          value
        }
      }
    }
  }
  ${LOYALTY_FIELDS}
`;
