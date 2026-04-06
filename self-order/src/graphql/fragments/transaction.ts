import { gql } from '@apollo/client';

export const TRANSACTION_FIELDS = gql`
  fragment TransactionFields on Transaction {
    id
    channel
    type
    state
    token
    amount
    vatExcludeAmount
    currency
    description
    code
    comment
    entry
    createdAt
    updatedAt
    balance
    links {
      name
      description
      logo
      link
    }
    image
  }
`;
