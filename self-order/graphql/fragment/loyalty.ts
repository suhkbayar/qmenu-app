import { gql } from '@apollo/client';

export const LOYALTY_FIELDS = gql`
  fragment LoyaltyFields on Loyalty {
    id
    name
    type
    description
    active
  }
`;
